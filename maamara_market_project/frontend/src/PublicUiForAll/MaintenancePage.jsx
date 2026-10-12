import React from "react";
import { ArrowRight, Clock3, PackageCheck, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MaintenancePage = ({ message }) => {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-background text-primary shadow-sm">
            <Wrench size={34} strokeWidth={1.7} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary">Maa Mara Market</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl">
            A little pause. A better marketplace.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {message || "We're making a few improvements to Maa Mara Market. We'll be back shortly. You can still check the status of an existing order below."}
          </p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs font-semibold text-primary">
            <Clock3 size={15} />
            Temporarily under maintenance
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageCheck size={21} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-card-foreground">Your orders are still here</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Sign in to review previous orders and follow the progress of an existing delivery.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/customer-order")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
          >
            Track an order <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  );
};

export default MaintenancePage;
