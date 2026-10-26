export const clerkAppearance = {
  layout: { unsafe_disableDevelopmentModeWarnings: true },
  variables: {
    colorBackground: "#151113",
    colorBorder: "#3b3034",
    colorForeground: "#f2eef0",
    colorInput: "#090809",
    colorInputForeground: "#f2eef0",
    colorMuted: "#211a1d",
    colorMutedForeground: "#f0c3cc",
    colorPrimary: "#ff91a7",
    colorPrimaryForeground: "#f2eef0",
    borderRadius: "0.2rem",
  },
  elements: {
    footer: { display: "none" },
    badge: {
      color: "#f0c3cc",
      backgroundColor: "#302329",
    },
    menuButton: {
      color: "#f0c3cc",
    },
    userButtonPopoverActionButton: {
      color: "#ff91a7",
      "&:hover, &:focus-visible": {
        backgroundColor: "rgba(255, 145, 167, 0.12)",
        color: "#ffb0bf",
      },
    },
    userButtonPopoverCard: {
      border: "1px solid #3b3034",
    },
  },
};
