"use client";

import Link from "next/link";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import type { Branch } from "@/types/branch";


export function BranchList() {
  const { data, error, isLoading } = useFetch<Branch[]>("/api/admin/branches");

  if (isLoading) return <Loading label="Đang tải..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption className="sr-only">Danh sách chi nhánh</caption>
        <thead>
          <tr>
            <th scope="col">Tên</th>
            <th scope="col">Địa chỉ</th>
            <th scope="col">Bán kính</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Bản đồ</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((branch) => (
            <tr key={branch.id}>
              <td>
                <Link
                  href={`/admin/branches/${branch.id}`}
                  className={"ui-link"}
                >
                  {branch.name}
                </Link>
              </td>
              <td>{branch.address}</td>
              <td>{branch.radiusM} m</td>
              <td>{branch.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</td>
              <td>
                {/* Built from coordinates, never the stored link: an admin could have saved any string there. */}
                <a
                  href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={"ui-link"}
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
