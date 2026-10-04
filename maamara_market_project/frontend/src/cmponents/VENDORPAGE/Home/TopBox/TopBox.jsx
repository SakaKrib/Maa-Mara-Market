import { useCustomerSocket } from "../../../../cmponents/Hooks/Customer/CustomerHook";

const getColorForLetter = (letter) => {
  const colors = ["#E57373","#F06292","#BA68C8","#64B5F6","#4DB6AC","#81C784","#FFD54F","#FFB74D","#A1887F","#90A4AE"];
  if (!letter) return "#607D8B";
  return colors[(letter.toUpperCase().charCodeAt(0) - 65) % colors.length];
};

const TopBox = () => {
  const { customers, connected } = useCustomerSocket();

  return (
    <div className="flex min-h-[136px] min-w-0 flex-col">
      <div className="flex items-center justify-between border-b border-[#e6e6e4] pb-3">
        <div>
          <h2 className="text-base font-bold text-[#222] sm:text-lg">Customers</h2>
          <p className="mt-0.5 text-xs text-[#595959]">{customers.length} customer{customers.length === 1 ? "" : "s"}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`} title={connected ? "Connected" : "Connecting"} />
      </div>

      <div className="mt-3 max-h-[230px] overflow-y-auto pr-1">
        <div className="space-y-2">
          {customers.length > 0 ? customers.map((customer) => {
            const fullName = customer.full_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Guest User";
            const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const bgColor = getColorForLetter(initials[0]);
            return (
              <div key={customer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#eeeeeb] bg-[#fcfcfa] p-2.5 transition hover:bg-[#f8f8f6]">
                <div className="flex min-w-0 items-center gap-3">
                  {customer.profile_picture ? (
                    <img src={customer.profile_picture} alt={fullName} className="h-10 w-10 shrink-0 rounded-full border border-[#d9d9d6] object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d9d9d6] bg-white text-sm font-bold" style={{ color: bgColor }}>
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#222]">{fullName}</p>
                    <p className="truncate text-xs text-[#595959]">{customer.email || "No email"}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-[#595959]">{customer.city || "Nairobi"}</span>
              </div>
            );
          }) : (
            <div className="rounded-xl border border-dashed border-[#d7d7d3] bg-[#f8f8f6] p-5 text-sm font-medium text-[#374151]">
              No customers yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBox;
