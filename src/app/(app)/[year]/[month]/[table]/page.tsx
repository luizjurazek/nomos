import { notFound, redirect } from "next/navigation";
import { isTableSlug } from "@/components/finance/table-tabs";

/** Legacy per-table route: the lists now live on the month screen, so keep old links working by redirecting. */
export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ year: string; month: string; table: string }>;
}) {
  const { year, month, table } = await params;
  if (!isTableSlug(table)) notFound();

  redirect(`/${year}/${month}?tab=${table}`);
}
