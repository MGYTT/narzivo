"use client";

import type {
  ButtonHTMLAttributes,
  MouseEvent,
} from "react";

type Props =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    message?: string;
  };

export function ConfirmSubmitButton({
  children,
  message = "Czy na pewno chcesz wykonać tę operację?",
  onClick,
  ...props
}: Props) {
  function handleClick(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const confirmed =
      window.confirm(message);

    if (!confirmed) {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    onClick?.(event);
  }

  return (
    <button
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}