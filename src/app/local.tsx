import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AI_TIERS } from '@/game/ai';
import type { AiTier } from '@/game/ai/types';
import { EVENT_EXPANSIONS } from '@/game/data/events';
import type { EventExpansion } from '@/game/data/types';
import { Chip } from '@/game/ui/Chip';
import { MenuBackdrop } from '@/game/ui/menu/MenuBackdrop';
import {
  InkLink,
  PaperHeading,
  PaperSection,
  PaperSheet,
  usePaperText,
  StampButton,
} from '@/game/ui/menu/PaperUi';
import { SavedGames } from '@/game/ui/SavedGames';
import { themedStyles } from '@/game/ui/theme/use-theme';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n/use-t';
import { useNames } from '@/i18n/use-names';

const COUNTS = [4, 5, 6, 7];

export default function LocalSetupScreen() {
  const router = useRouter();
  const t = useT().routes.local;
  const names = useNames();
  const [players, setPlayers] = useState(5);
  const [tier, setTier] = useState<AiTier>('medium');
  const [eventExpansion, setEventExpansion] = useState<EventExpansion | null>(null);
  const [valley, setValley] = useState(false);
  const [goldrush, setGoldrush] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() % 100000));
  const styles = useStyles();
  const paperText = usePaperText();

  return (
    <View style={styles.screen}>
      <MenuBackdrop veil={0.55} />
      <ScrollView contentContainerStyle={styles.container}>
        <PaperSheet>
          <PaperHeading eyebrow={t.eyebrow} title={t.title} />

          <SavedGames />

          <PaperSection title={t.players}>
            <Row>
              {COUNTS.map((n) => (
                <Chip key={n} label={t.playerCount(n)} active={players === n} onPress={() => setPlayers(n)} />
              ))}
            </Row>
            <Text style={paperText.hint}>
              {t.composition[players]}
            </Text>
          </PaperSection>

          <PaperSection title={t.aiTier}>
            <Row>
              {AI_TIERS.map((x) => (
                <Chip key={x} label={names.aiTier(x)} active={tier === x} onPress={() => setTier(x)} />
              ))}
            </Row>
            <Text style={paperText.hint}>
              {t.tierHint[tier]}
            </Text>
          </PaperSection>

          <PaperSection title={t.eventExpansion}>
            <Row>
              <Chip label={t.eventBase} active={eventExpansion === null} onPress={() => setEventExpansion(null)} />
              {EVENT_EXPANSIONS.map((x) => (
                <Chip
                  key={x}
                  label={names.expansionName(x)}
                  active={eventExpansion === x}
                  onPress={() => setEventExpansion(x)}
                />
              ))}
            </Row>
            <Text style={paperText.hint}>{t.eventHint[eventExpansion ?? 'none']}</Text>
          </PaperSection>

          <PaperSection title={t.cardExpansion}>
            <Row>
              <Chip label={t.noValley} active={!valley} onPress={() => setValley(false)} />
              <Chip label={t.valley} active={valley} onPress={() => setValley(true)} />
            </Row>
            <Text style={paperText.hint}>{t.valleyHint}</Text>
            <Row>
              <Chip label={t.noGoldrush} active={!goldrush} onPress={() => setGoldrush(false)} />
              <Chip label={t.goldrush} active={goldrush} onPress={() => setGoldrush(true)} />
            </Row>
            <Text style={paperText.hint}>{t.goldrushHint}</Text>
          </PaperSection>

          <PaperSection title={t.seed}>
            <Row>
              <Text style={paperText.value}>{seed}</Text>
              <Chip label={t.reroll} active={false} onPress={() => setSeed(Math.floor(Math.random() * 100000))} />
            </Row>
            <Text style={paperText.hint}>{t.seedHint}</Text>
          </PaperSection>

          <StampButton
            label={t.start}
            onPress={() =>
              router.push({
                pathname: '/game/[id]',
                params: {
                  id: 'local',
                  players: String(players),
                  tier,
                  event: eventExpansion ?? 'none',
                  valley: valley ? '1' : '0',
                  goldrush: goldrush ? '1' : '0',
                  seed: String(seed),
                },
              })
            }
          />

          <InkLink label={t.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </PaperSheet>
      </ScrollView>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.row}>{children}</View>;
}

const useStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    paddingVertical: Spacing.five,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
}));
