#!/usr/bin/env python3
"""Resolve merge conflicts in settings.tsx"""

with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

# Conflict 1: imports - keep upstream (need useEffect for RevenueCat, Alert+TouchableOpacity for subscription UI)
old1 = "<<<<<<< Updated upstream\nimport { useEffect, useState } from 'react';\nimport { Alert, TouchableOpacity } from 'react-native';\n=======\nimport { useState } from 'react';\n>>>>>>> Stashed changes"
new1 = "import { useEffect, useState } from 'react';\nimport { Alert, TouchableOpacity } from 'react-native';"
content = content.replace(old1, new1)

# Conflict 2: PAYWALL/STORAGE imports - keep PAYWALL imports, drop STORAGE_KEYS (hooks handle it)  
old2 = "<<<<<<< Updated upstream\nimport { PAYWALL_ENABLED, REVENUECAT_ENTITLEMENT_ID } from '../../lib/revenuecat';\nimport { STORAGE_KEYS } from '../../lib/storageKeys';\n=======\n>>>>>>> Stashed changes"
new2 = "import { PAYWALL_ENABLED, REVENUECAT_ENTITLEMENT_ID } from '../../lib/revenuecat';"
content = content.replace(old2, new2)

# Conflict 3: state & handlers - merge: use stash's cleaner hook setters + upstream's RevenueCat state
# Find the third conflict boundaries
c3_start = content.find("<<<<<<< Updated upstream\n  const { budgetingEnabled }")
if c3_start == -1:
    # try broader search
    idx = content.find("useDefaultCurrency();")
    c3_start = content.find("<<<<<<< Updated upstream", idx)

c3_mid = content.find("=======\n  const { budgetingEnabled, setBudgetingEnabled }")
c3_end = content.find(">>>>>>> Stashed changes\n  };", c3_mid)

if c3_start != -1 and c3_mid != -1 and c3_end != -1:
    # Extract just the "  };" that follows the marker
    end_marker = ">>>>>>> Stashed changes\n"
    actual_end = content.find(end_marker, c3_mid) + len(end_marker)
    
    old3 = content[c3_start:actual_end]
    
    new3 = """  const { budgetingEnabled, setBudgetingEnabled } = useBudgetingEnabled();
  const { tripsEnabled, setTripsEnabled } = useTripsEnabled();
  const { advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled } =
    useAdvancedAnalyticsEnabled();
  const [isTogglingFeature, setIsTogglingFeature] = useState(false);
  const {
    hasPro,
    isLoading: isRevenueCatLoading,
    isPaywallLoading,
    isRestoring,
    error: revenueCatError,
    presentPaywall,
    restorePurchases,
    openCustomerCenter,
  } = useRevenueCat();
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (revenueCatError) {
      setSubscriptionMessage(revenueCatError);
    }
  }, [revenueCatError]);

  const handleBudgetingToggle = async () => {
    if (!hasPro) {
      await handlePaywall();
      return;
    }
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setBudgetingEnabled(!budgetingEnabled);
    } finally {
      setIsTogglingFeature(false);
    }
  };

  const handleTripsToggle = async () => {
    if (!hasPro) {
      await handlePaywall();
      return;
    }
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setTripsEnabled(!tripsEnabled);
    } finally {
      setIsTogglingFeature(false);
    }
  };

  const handleAnalyticsToggle = async () => {
    if (!hasPro) {
      await handlePaywall();
      return;
    }
    if (isTogglingFeature) return;
    setIsTogglingFeature(true);
    try {
      await setAdvancedAnalyticsEnabled(!advancedAnalyticsEnabled);
    } finally {
      setIsTogglingFeature(false);
    }"""
    
    content = content.replace(old3, new3)
    print("Conflict 3 resolved")
else:
    print(f"ERROR: Could not find conflict 3 boundaries: start={c3_start}, mid={c3_mid}, end={c3_end}")

# Conflict 4: subscription UI vs feature toggles - keep upstream (subscription management)
# The stash's feature toggles are duplicates of what upstream already has in the Pro Features section
c4_start = content.find("<<<<<<< Updated upstream\n              <TouchableOpacity")
if c4_start == -1:
    c4_start = content.find("<<<<<<< Updated upstream", content.find("borderTopColor"))
    
c4_end_marker = ">>>>>>> Stashed changes\n"
c4_end_search = content.find(c4_end_marker, c4_start)

if c4_start != -1 and c4_end_search != -1:
    old4 = content[c4_start:c4_end_search + len(c4_end_marker)]
    
    # Extract upstream content between <<<<<<< and =======
    upstream_start = c4_start + len("<<<<<<< Updated upstream\n")
    upstream_end = content.find("\n=======\n", c4_start)
    upstream_content = content[upstream_start:upstream_end]
    
    content = content.replace(old4, upstream_content + "\n")
    print("Conflict 4 resolved")
else:
    print(f"ERROR: Could not find conflict 4: start={c4_start}, end={c4_end_search}")

remaining = content.count("<<<<<<")
print(f"Remaining conflicts: {remaining}")

# Now update the feature toggle switches in the Pro Features section to use hook values instead of local state
content = content.replace("checked={localBudgetingEnabled}", "checked={budgetingEnabled}")
content = content.replace("checked={localTripsEnabled}", "checked={tripsEnabled}")
content = content.replace("checked={localAnalyticsEnabled}", "checked={advancedAnalyticsEnabled}")

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)

print("settings.tsx fully resolved")
