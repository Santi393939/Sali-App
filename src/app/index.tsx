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
import ComingSoonScreen from '@/screens/ComingSoonScreen';
import MeScreen from '@/screens/MeScreen';
import StatsScreen from '@/screens/StatsScreen';
import TodayScreen from '@/screens/TodayScreen';

const TABS: Tab[] = [
  { key: 'today', label: 'Today', Icon: TodayIcon, render: () => <TodayScreen /> },
  {
    key: 'reminders',
    label: 'Reminders',
    Icon: RemindersIcon,
    render: () => (
      <ComingSoonScreen
        dark
        title="Reminders"
        arabic="تذكير"
        heading="Short reminders, one swipe at a time"
        body="Qur'an verses, hadith and short videos on the Prophet ﷺ, with a button to send 10 salawat. This feed is built in the next step."
      />
    ),
  },
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
  return <TabPager tabs={TABS} />;
}
