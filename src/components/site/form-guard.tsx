"use client";

import { useEffect, useState } from "react";

import { issueFormToken } from "@/lib/public/actions";

/**
 * The invisible half of the forms' spam protection. Drop it inside a `<form>`.
 *
 * It renders two things a person never sees:
 *  - a hidden `formToken`, fetched when the form loads, that the API checks for
 *    a valid signature and for how long the page has been open;
 *  - a trap input called `website`, off-screen and inert, that only a script
 *    which fills every field will touch.
 *
 * The token is refreshed every 30 minutes so a form left open all afternoon
 * still sends a live one. See `api/src/lib/form-guard.ts` for what the API does
 * with them and what this does not stop.
 */
export function FormGuard() {
  const [token, setToken] = useState("");

  useEffect(() => {
    let active = true;

    const load = () => {
      issueFormToken()
        .then((next) => {
          if (active && next) setToken(next);
        })
        .catch(() => {
          // The API being briefly unreachable must not break the form; a
          // missing token is refused with a plain "reload and try again".
        });
    };

    load();
    const id = setInterval(load, 30 * 60_000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <input type="hidden" name="formToken" value={token} />
      {/* Off-screen rather than `display: none`, which simple bots skip. `inert`
          removes it from the tab order and from screen readers. */}
      <div
        aria-hidden
        inert
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}
