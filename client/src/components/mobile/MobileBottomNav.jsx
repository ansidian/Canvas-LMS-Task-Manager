import { Box, Text, Indicator } from "@mantine/core";
import { motion } from "framer-motion";
import {
  IconCalendar,
  IconInbox,
  IconSettings,
} from "@tabler/icons-react";
import { useAppControllerContext } from "../../contexts/AppControllerContext";
import { notifySuccess } from "../../utils/notify";

const tabs = [
  { key: "calendar", label: "Calendar", icon: IconCalendar },
  { key: "pending", label: "Pending", icon: IconInbox },
  { key: "settings", label: "Settings", icon: IconSettings },
];

export default function MobileBottomNav({ activeTab = "calendar", onTabChange }) {
  const controller = useAppControllerContext();
  const pendingCount = controller.filteredPendingItems?.length || 0;

  const handleTabPress = (key) => {
    if (key === "pending") {
      if (pendingCount > 0) {
        controller.setApprovalIndex(0);
      } else {
        notifySuccess("No pending items", {
          description: "Connect Canvas in Settings to sync assignments.",
        });
      }
    } else if (key === "settings") {
      controller.setSettingsOpen(true);
    } else if (key === "calendar") {
      onTabChange?.("calendar");
    }
  };

  return (
    <Box
      className="mobile-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: "var(--card)",
        borderTop: "1px solid var(--rule)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = key === activeTab;
        const showBadge = key === "pending" && pendingCount > 0;

        return (
          <motion.div
            key={key}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={() => handleTabPress(key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              padding: "6px 0",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {showBadge ? (
              <Indicator
                label={pendingCount > 99 ? "99+" : pendingCount}
                size={16}
                offset={2}
                color="var(--ink-blue)"
              >
                <Icon
                  size={22}
                  stroke={isActive ? 2.2 : 1.5}
                  style={{ color: isActive ? "var(--ink-blue)" : "var(--graphite)" }}
                />
              </Indicator>
            ) : (
              <Icon
                size={22}
                stroke={isActive ? 2.2 : 1.5}
                style={{ color: isActive ? "var(--ink-blue)" : "var(--graphite)" }}
              />
            )}
            <Text
              size="xs"
              fw={isActive ? 600 : 400}
              style={{ color: isActive ? "var(--ink-blue)" : "var(--graphite)" }}
            >
              {label}
            </Text>
          </motion.div>
        );
      })}
    </Box>
  );
}
