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

import GroupScreen from '@/screens/GroupScreen';
import MeScreen from '@/screens/MeScreen';
import RemindersScreen from '@/screens/RemindersScreen';
import StatsScreen from '@/screens/StatsScreen';
import TodayScreen from '@/screens/TodayScreen';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';
import { isDarkMode } from '@/theme';

const TABS = (): Tab[] => [
  { key: 'today', label: t('Today'), Icon: TodayIcon, render: () => <TodayScreen /> },
  { key: 'reminders', label: t('Reminders'), Icon: RemindersIcon, dark: isDarkMode(), render: () => <RemindersScreen /> },
  { key: 'group', label: t('Groups'), Icon: GroupIcon, render: () => <GroupScreen /> },
  { key: 'stats', label: t('Stats'), Icon: StatsIcon, render: () => <StatsScreen /> },
  { key: 'me', label: t('Me'), Icon: MeIcon, render: () => <MeScreen /> },
];

export default function Home() {
  const { onboarded } = useSettings();
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <TabPager tabs={TABS()} />;
}
