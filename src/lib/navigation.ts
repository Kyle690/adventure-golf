import { router, useNavigation } from 'expo-router';

/**
 * Leaves the game flow (the root "game" stack presented over the tabs) in one step, back to the
 * tab screen it was opened from (Home, a venue, a player...). Used by "Leave game", "Save & exit"
 * and quitting a round.
 */
export function useExitGameFlow() {
  const navigation = useNavigation();
  return () => {
    // This screen's navigator is the game stack; its parent entry is the "game" route in the root stack.
    const gameRoute = navigation.getParent();
    if (gameRoute?.canGoBack()) gameRoute.goBack();
    else router.replace('/');
  };
}

/** After "Confirm result": back to the Home tab with the game flow gone from history. */
export function finishToHome() {
  router.dismissTo('/');
}
