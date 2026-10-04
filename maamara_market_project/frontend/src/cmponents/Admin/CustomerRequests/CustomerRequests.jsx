import React from "react";
import PendingReturnsList from "../Returns/ApproveReturns";

const CustomerToAdminRequests = () => (
  <div className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-custom sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Marketplace</p>
        <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">Returns & Customer Requests</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review customer refund and exchange requests and process the appropriate admin decision.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-custom sm:p-5">
        <PendingReturnsList />
      </div>
    </div>
  </div>
);

export default CustomerToAdminRequests;
