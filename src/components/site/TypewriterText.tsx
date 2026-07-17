import { useEffect, useState } from "react";

export function TypewriterText({ text }: { text: string }) {
  const [typed, setTyped] = useState("");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setReduced(true);
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (reduced || !text) {
      setTyped(text);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const TYPE_MS = 55;
    const ERASE_MS = 28;
    const HOLD_MS = 2600;
    const GAP_MS = 600;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    const run = async () => {
      while (!cancelled) {
        for (let i = 1; i <= text.length; i++) {
          if (cancelled) return;
          setTyped(text.slice(0, i));
          await wait(TYPE_MS);
        }
        if (cancelled) return;
        await wait(HOLD_MS);
        for (let i = text.length; i >= 0; i--) {
          if (cancelled) return;
          setTyped(text.slice(0, i));
          await wait(ERASE_MS);
        }
        await wait(GAP_MS);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [text, reduced]);

  return (
    <span aria-label={text}>
      <span aria-hidden={!reduced}>{typed}</span>
      {!reduced && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block w-[1px] align-baseline"
          style={{
            height: "1em",
            background: "currentColor",
            animation: "tw-cursor 1s steps(1) infinite",
            verticalAlign: "-0.15em",
          }}
        />
      )}
      <style>{`@keyframes tw-cursor{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
    </span>
  );
}
