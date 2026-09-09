import { signOut } from "@/lib/admin/actions";
import { verifySession } from "@/lib/admin/dal";

export async function OperatorMenu() {
  const { user } = await verifySession();

  return (
    <div className="flex items-center gap-4">
      <span className="font-sans text-[13px] text-white/70">
        {user.name}
        <span className="text-white/40"> · {user.role}</span>
      </span>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-sm border border-white/30 px-3 py-1.5 font-sans text-[12px] font-medium tracking-[0.08em] text-white/80 uppercase transition-colors hover:border-white hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
