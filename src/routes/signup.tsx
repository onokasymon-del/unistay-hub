import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Building2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Join UniStay — Create your account" },
      { name: "description", content: "Sign up as a student to book hostels, or as a landlord to list your property on UniStay." },
    ],
  }),
  component: SignupChooser,
});

function SignupChooser() {
  return (
    <div className="container-page max-w-3xl py-12">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">Join UniStay</h1>
        <p className="mt-2 text-muted-foreground">Pick the account that fits you. You can change later.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <RoleCard
          to="/signup/student"
          icon={<GraduationCap className="h-6 w-6" />}
          title="I'm a student"
          desc="Find affordable hostels near your campus, save favourites and book in minutes."
          tag="Free forever"
        />
        <RoleCard
          to="/signup/landlord"
          icon={<Building2 className="h-6 w-6" />}
          title="I'm a landlord"
          desc="List your hostel and reach thousands of verified students. Verification required."
          tag="Verification needed"
        />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function RoleCard({
  to,
  icon,
  title,
  desc,
  tag,
}: {
  to: "/signup/student" | "/signup/landlord";
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-border bg-card p-6 transition hover:border-accent hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {tag}
          </span>
        </div>
      </div>
    </Link>
  );
}
