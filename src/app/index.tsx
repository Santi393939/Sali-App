/** The app's home: five swipeable tabs. */
import {
  GroupIcon,
  MeIcon,
  RemindersIcon,
  StatsIcon,
  TabPager,
  TodayIcon,
  type Tab,
} from '@/components/tabs';
import { Redirect } from 'expo-router';

import ComingSoonScreen from '@/screens/ComingSoonScreen';
import MeScreen from '@/screens/MeScreen';
import RemindersScreen from '@/screens/RemindersScreen';
import StatsScreen from '@/screens/StatsScreen';
import TodayScreen from '@/screens/TodayScreen';
import { useSettings } from '@/store/settings';

const TABS: Tab[] = [
  { key: 'today', label: 'Today', Icon: TodayIcon, render: () => <TodayScreen /> },
  { key: 'reminders', label: 'Reminders', Icon: RemindersIcon, dark: true, render: () => <RemindersScreen /> },
  {
    key: 'group',
    label: 'Group',
    Icon: GroupIcon,
    render: () => (
      <ComingSoonScreen
        title="Group"
        arabic="العائلة"
        heading="Count together for Jumu'ah"
        body="Create a group, invite family by code and light the ten arched windows together. Groups arrive once accounts are set up."
      />
    ),
  },
  { key: 'stats', label: 'Stats', Icon: StatsIcon, render: () => <StatsScreen /> },
  { key: 'me', label: 'Me', Icon: MeIcon, render: () => <MeScreen /> },
];

export default function Home() {
  const { onboarded } = useSettings();
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <TabPager tabs={TABS} />;
}
