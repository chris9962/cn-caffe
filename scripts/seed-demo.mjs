import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToEmail } from "../lib/auth/phone.ts";

const PASSWORD = "Test1234";
const BRANCH_RADIUS_M = 100;
const SHIFT_DAYS = 5;

const PEOPLE = [
  { phone: "0900000002", fullName: "Nhân viên bán thời gian", role: "staff", employmentType: "part_time", amount: 25_000 },
  { phone: "0900000003", fullName: "Nhân viên toàn thời gian", role: "staff", employmentType: "full_time", amount: 28_000 },
  { phone: "0900000004", fullName: "Quản lý thử", role: "manager", employmentType: "full_time", amount: 32_000 },
];

const [latitudeInput, longitudeInput] = process.argv.slice(2);
const latitude = Number(latitudeInput);
const longitude = Number(longitudeInput);
if (!latitudeInput || !longitudeInput || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
  console.error("Usage: npm run seed:demo -- <latitude> <longitude>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function run(query, action) {
  const { data, error } = await query;
  if (error) {
    console.error(`Could not ${action}: ${error.message}`);
    process.exit(1);
  }
  return data;
}

const admin = await run(
  supabase.from("employees").select("id").eq("role", "admin").limit(1).maybeSingle(),
  "find an admin",
);
if (!admin) {
  console.error("No admin found. Run npm run admin:create first.");
  process.exit(1);
}

const phones = PEOPLE.map((person) => normalizePhone(person.phone));
const existing = await run(supabase.from("employees").select("phone").in("phone", phones), "check existing accounts");
if (existing.length > 0) {
  console.error(`Seed accounts already exist: ${existing.map((row) => row.phone).join(", ")}.`);
  process.exit(1);
}

// Work dates and month starts are Vietnam dates, matching how the database assigns work_date.
const vietnamDate = (offsetDays) =>
  new Date(Date.now() + 7 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const today = vietnamDate(0);
const [year, month] = today.split("-").map(Number);
const previousMonthStart = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);

const branch = await run(
  supabase
    .from("branches")
    .insert({ name: "Chi nhánh thử nghiệm", latitude, longitude, radius_m: BRANCH_RADIUS_M })
    .select("id")
    .single(),
  "create the branch",
);

const ids = {};
for (const person of PEOPLE) {
  const phone = normalizePhone(person.phone);
  const { data, error } = await supabase.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error(`Could not create the Auth user ${phone}: ${error.message}`);
    process.exit(1);
  }
  const { error: insertError } = await supabase.from("employees").insert({
    id: data.user.id,
    full_name: person.fullName,
    phone,
    role: person.role,
    employment_type: person.employmentType,
    requires_attendance: true,
    must_change_password: false,
  });
  if (insertError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    console.error(`Could not create the employee ${phone}: ${insertError.message}`);
    process.exit(1);
  }
  ids[person.phone] = data.user.id;
}

const managerId = ids["0900000004"];
await run(supabase.from("manager_branches").insert({ manager_id: managerId, branch_id: branch.id }), "assign the branch");
await run(
  supabase.from("manager_permissions").insert(
    ["shifts.view", "shifts.review", "shifts.edit"].map((permission) => ({ manager_id: managerId, permission })),
  ),
  "grant manager permissions",
);

await run(
  supabase.from("pay_rates").insert(
    PEOPLE.map((person) => ({
      employee_id: ids[person.phone],
      employment_type: person.employmentType,
      amount: person.amount,
      effective_from: previousMonthStart,
    })),
  ),
  "add pay rates",
);

const shiftDates = Array.from({ length: SHIFT_DAYS }, (_, index) => vietnamDate(-(SHIFT_DAYS - index)));
const monthStarts = [...new Set(shiftDates.map((date) => `${date.slice(0, 7)}-01`))];
// Keeps any config an admin already set; only fills months that have none.
await run(
  supabase
    .from("monthly_configs")
    .upsert(monthStarts.map((start) => ({ month: start, overtime_hourly_rate: 35_000 })), { ignoreDuplicates: true }),
  "add monthly configs",
);

const shift = (phone, date, checkIn, checkOut, overrides = {}) => ({
  employee_id: ids[phone],
  branch_id: branch.id,
  work_date: date,
  status: "valid",
  source: "manual",
  check_in_at: checkIn,
  check_out_at: checkOut,
  // A bulk insert sends every column used by any row, so a missing key becomes null instead of the default.
  fail_reasons: [],
  created_by: admin.id,
  ...overrides,
});

const lastDate = shiftDates.at(-1);
const nextDay = vietnamDate(0);
await run(
  supabase.from("shifts").insert([
    ...shiftDates.flatMap((date) => [
      shift("0900000002", date, `${date}T08:00:00+07:00`, `${date}T12:00:00+07:00`),
      shift("0900000003", date, `${date}T08:00:00+07:00`, `${date}T17:00:00+07:00`),
    ]),
    shift("0900000002", lastDate, `${lastDate}T21:00:00+07:00`, `${nextDay}T00:30:00+07:00`),
    // Managers never review their own shifts, so the shift waiting for review belongs to staff.
    shift("0900000002", lastDate, `${lastDate}T13:00:00+07:00`, `${lastDate}T17:00:00+07:00`, {
      status: "pending_review",
      fail_reasons: ["outside_radius"],
    }),
  ]),
  "add sample shifts",
);

console.log(`Created branch "Chi nhánh thử nghiệm" at ${latitude}, ${longitude} (radius ${BRANCH_RADIUS_M} m).`);
for (const person of PEOPLE) console.log(`  ${person.phone}  ${person.fullName}`);
console.log(`Password for every seed account: ${PASSWORD}`);
