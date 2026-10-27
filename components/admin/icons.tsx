import type { SVGProps } from "react";

/** Line icons for the back office, drawn on a 24px grid at 1.5px. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const IconDashboard = (p: P) => (
  <Icon {...p}><rect x="3.5" y="3.5" width="7" height="8" /><rect x="13.5" y="3.5" width="7" height="5" /><rect x="13.5" y="11.5" width="7" height="9" /><rect x="3.5" y="14.5" width="7" height="6" /></Icon>
);
export const IconReceipt = (p: P) => (
  <Icon {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></Icon>
);
export const IconQuote = (p: P) => (
  <Icon {...p}><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" /><path d="M14 3v5h5" /><path d="M8.5 13h7M8.5 16.5h4.5" /></Icon>
);
export const IconCart = (p: P) => (
  <Icon {...p}><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6" /><circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></Icon>
);
export const IconCard = (p: P) => (
  <Icon {...p}><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3 10h18M7 15h3" /></Icon>
);
export const IconStar = (p: P) => (
  <Icon {...p}><path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" /></Icon>
);
export const IconGift = (p: P) => (
  <Icon {...p}><rect x="3.5" y="8.5" width="17" height="4" /><path d="M5 12.5v8h14v-8M12 8.5v12" /><path d="M12 8.5S10.8 4 8.3 4.6C6.4 5.1 7 8.5 12 8.5zM12 8.5s1.2-4.5 3.7-3.9c1.9.5 1.3 3.9-3.7 3.9z" /></Icon>
);
export const IconStore = (p: P) => (
  <Icon {...p}><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12v8.5h13V12M10 20.5v-5h4v5" /></Icon>
);
export const IconLogout = (p: P) => (
  <Icon {...p}><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></Icon>
);
export const IconPlus = (p: P) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const IconDownload = (p: P) => (
  <Icon {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></Icon>
);
export const IconPrint = (p: P) => (
  <Icon {...p}><path d="M7 8V3.5h10V8" /><rect x="3.5" y="8" width="17" height="8" rx="1.5" /><path d="M7 13.5h10v7H7z" /></Icon>
);
export const IconEye = (p: P) => (
  <Icon {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Icon>
);
export const IconCopy = (p: P) => (
  <Icon {...p}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5" /><path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3" /></Icon>
);
export const IconTrash = (p: P) => (
  <Icon {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></Icon>
);
export const IconUp = (p: P) => (
  <Icon {...p}><path d="m6.5 14.5 5.5-5.5 5.5 5.5" /></Icon>
);
export const IconDown = (p: P) => (
  <Icon {...p}><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></Icon>
);
export const IconSearch = (p: P) => (
  <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></Icon>
);
export const IconX = (p: P) => (
  <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);
