import { Tooltip } from "./Tooltip";

type RequiredMarkProps = {
  tooltip: string;
};

/** Orange required asterisk with an accessible hover/focus tooltip. */
export function RequiredMark({ tooltip }: RequiredMarkProps) {
  return (
    <Tooltip content={tooltip}>
      <span
        className="ms-0.5 cursor-help text-orange-500 dark:text-orange-400"
        tabIndex={0}
        title={tooltip}
        aria-label={tooltip}
      >
        *
      </span>
    </Tooltip>
  );
}
