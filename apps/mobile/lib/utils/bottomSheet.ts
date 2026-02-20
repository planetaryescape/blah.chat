import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { createElement } from "react";

export function renderStandardBackdrop(props: BottomSheetBackdropProps) {
  return createElement(BottomSheetBackdrop, {
    ...props,
    disappearsOnIndex: -1,
    appearsOnIndex: 0,
    opacity: 0.5,
    pressBehavior: "close" as const,
  });
}
