import { useMediaQuery } from "@mantine/hooks";

export default function useIsMobile() {
  // Portrait phones OR landscape phones (short viewport height + touch device)
  return useMediaQuery(
    "(max-width: 768px), (max-height: 500px) and (pointer: coarse)"
  );
}
