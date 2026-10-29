export function ExportLinks({ href, label = "Export" }: { href: string; label?: string }) {
  const csv = href.includes("?") ? `${href}&format=csv` : `${href}?format=csv`;
  const xlsx = href.includes("?") ? `${href}&format=xlsx` : `${href}?format=xlsx`;
  const className =
    "inline-flex min-h-10 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50";
  return (
    <div className="flex flex-wrap gap-2">
      <a className={className} href={csv}>
        {label} CSV
      </a>
      <a className={className} href={xlsx}>
        {label} Excel
      </a>
    </div>
  );
}
