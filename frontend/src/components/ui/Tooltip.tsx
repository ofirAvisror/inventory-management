import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type TooltipProps = {
  content: string;
  children: ReactNode;
};

// Clone the single child so `aria-describedby` lands on the actual focusable
// trigger element (e.g. RequiredMark's `<span tabIndex={0}>`). Putting it on
// an outer wrapper means screen readers won't announce the description when
// focus moves to the trigger.
export function Tooltip({ content, children }: TooltipProps) {
  const tooltipId = useId();
  const child = Children.only(children);
  const trigger = isValidElement(child)
    ? cloneElement(child as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": tooltipId,
      })
    : child;

  return (
    <span className="group/tooltip relative inline-flex align-middle">
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-start text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {content}
      </span>
    </span>
  );
}
