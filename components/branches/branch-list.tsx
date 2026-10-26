"use client";

import Link from "next/link";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import type { Branch } from "@/types/branch";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

export function BranchList() {
  const { data, error, isLoading } = useFetch<Branch[]>("/api/admin/branches");

  if (isLoading) return <Loading label="Đang tải..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">Danh sách chi nhánh</caption>
        <thead>
          <tr className="border-b border-zinc-300">
            <th scope="col" className="p-2">Tên</th>
            <th scope="col" className="p-2">Địa chỉ</th>
            <th scope="col" className="p-2">Bán kính</th>
            <th scope="col" className="p-2">Trạng thái</th>
            <th scope="col" className="p-2">Bản đồ</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((branch) => (
            <tr key={branch.id} className="border-b border-zinc-200">
              <td className="p-2">
                <Link
                  href={`/admin/branches/${branch.id}`}
                  className={`rounded underline ${focusClass}`}
                >
                  {branch.name}
                </Link>
              </td>
              <td className="p-2">{branch.address}</td>
              <td className="p-2">{branch.radiusM} m</td>
              <td className="p-2">{branch.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</td>
              <td className="p-2">
                {/* Built from coordinates, never the stored link: an admin could have saved any string there. */}
                <a
                  href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded underline ${focusClass}`}
                >
                  Mở bản đồ
                  <span className="sr-only"> {branch.name} (mở tab mới)</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
