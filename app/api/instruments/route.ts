import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("instruments")
    .select("id, name");

  if (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to load instruments" },
      { status: 500 },
    );
  }

  return Response.json(data);
}
