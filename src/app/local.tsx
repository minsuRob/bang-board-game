import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AI_TIERS, AI_TIER_LABEL } from '@/game/ai';
import type { AiTier } from '@/game/ai/types';
import { EVENT_EXPANSIONS } from '@/game/data/events';
import { EXPANSION_LABEL, type EventExpansion } from '@/game/data/types';
import { Chip } from '@/game/ui/Chip';
import { MenuBackdrop } from '@/game/ui/menu/MenuBackdrop';
import {
  InkLink,
  PaperHeading,
  PaperInk,
  PaperSection,
  PaperSheet,
  paperText,
  StampButton,
} from '@/game/ui/menu/PaperUi';
import { SavedGames } from '@/game/ui/SavedGames';
import { Spacing } from '@/constants/theme';

const COUNTS = [4, 5, 6, 7];

const EVENT_HINT: Record<EventExpansion | 'none', string> = {
  none: '상황 카드 없이 기본 규칙으로 한다. 상황 카드 확장판은 한 판에 하나만 고를 수 있다.',
  highnoon: '하이 눈은 보안관의 두 번째 차례부터 매 라운드 상황 카드가 하나씩 열린다.',
  wildwestshow: '와일드 웨스트 쇼는 보안관의 두 번째 차례부터 매 라운드 상황 카드가 하나씩 열린다.',
  fistful: '한줌의 카드는 보안관의 두 번째 차례부터 매 라운드 상황 카드가 하나씩 열린다.',
};

export default function LocalSetupScreen() {
  const router = useRouter();
  const [players, setPlayers] = useState(5);
  const [tier, setTier] = useState<AiTier>('medium');
  const [eventExpansion, setEventExpansion] = useState<EventExpansion | null>(null);
  const [valley, setValley] = useState(false);
  const [goldrush, setGoldrush] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() % 100000));

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <MenuBackdrop veil={0.55} />
      <ScrollView contentContainerStyle={styles.container}>
        <PaperSheet>
          <PaperHeading eyebrow="GAME SETUP" title="판 설정" />

          <SavedGames />

          <PaperSection title="인원">
            <Row>
              {COUNTS.map((n) => (
                <Chip key={n} label={`${n}인`} active={players === n} onPress={() => setPlayers(n)} />
              ))}
            </Row>
            <Text style={paperText.hint}>
              {players === 4 && '보안관 1 · 무법자 2 · 배신자 1'}
              {players === 5 && '보안관 1 · 부관 1 · 무법자 2 · 배신자 1'}
              {players === 6 && '보안관 1 · 부관 1 · 무법자 3 · 배신자 1'}
              {players === 7 && '보안관 1 · 부관 2 · 무법자 3 · 배신자 1'}
            </Text>
          </PaperSection>

          <PaperSection title="AI 난이도">
            <Row>
              {AI_TIERS.map((t) => (
                <Chip key={t} label={AI_TIER_LABEL[t]} active={tier === t} onPress={() => setTier(t)} />
              ))}
            </Row>
            <Text style={paperText.hint}>
              {tier === 'easy' && '거의 아무렇게나 두지만 죽는 것만은 피한다.'}
              {tier === 'medium' && '공개된 역할만 보고 정석대로 둔다.'}
              {tier === 'hard' && '지금까지의 행동에서 감춰진 역할을 추론하고 앞을 내다본다.'}
            </Text>
          </PaperSection>

          <PaperSection title="상황 카드 확장판">
            <Row>
              <Chip label="기본" active={eventExpansion === null} onPress={() => setEventExpansion(null)} />
              {EVENT_EXPANSIONS.map((x) => (
                <Chip
                  key={x}
                  label={EXPANSION_LABEL[x]}
                  active={eventExpansion === x}
                  onPress={() => setEventExpansion(x)}
                />
              ))}
            </Row>
            <Text style={paperText.hint}>{EVENT_HINT[eventExpansion ?? 'none']}</Text>
          </PaperSection>

          <PaperSection title="카드·캐릭터 확장판">
            <Row>
              <Chip label="그림자의 계곡 없음" active={!valley} onPress={() => setValley(false)} />
              <Chip label="그림자의 계곡" active={valley} onPress={() => setValley(true)} />
            </Row>
            <Text style={paperText.hint}>
              그림자의 계곡은 기본 카드·캐릭터와 함께 사용할 수 있다. 상황 카드 확장판과도 함께 켤 수 있다.
            </Text>
            <Row>
              <Chip label="골드 러시 없음" active={!goldrush} onPress={() => setGoldrush(false)} />
              <Chip label="골드 러시" active={goldrush} onPress={() => setGoldrush(true)} />
            </Row>
            <Text style={paperText.hint}>
              골드 러시는 상처를 입히거나 맥주를 팔아 금덩이를 모으고, 상점에서 장비를 산다. 다른 확장판과 함께 켤 수
              있다.
            </Text>
          </PaperSection>

          <PaperSection title="시드">
            <Row>
              <Text style={paperText.value}>{seed}</Text>
              <Chip label="다시 뽑기" active={false} onPress={() => setSeed(Math.floor(Math.random() * 100000))} />
            </Row>
            <Text style={paperText.hint}>같은 시드는 언제나 같은 판을 만든다.</Text>
          </PaperSection>

          <StampButton
            label="시작"
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

          <InkLink label="← 돌아가기" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </PaperSheet>
      </ScrollView>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PaperInk.paper },
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
});
