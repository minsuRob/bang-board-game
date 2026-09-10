import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AI_TIERS, AI_TIER_LABEL } from '@/game/ai';
import type { AiTier } from '@/game/ai/types';
import { getIdentity, setNickname } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/config';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  markStarted,
  PRESENCE_TIMEOUT_MS,
  updateRoomSettings,
} from '@/firebase/rooms';
import { useRoomConnection } from '@/game/store/use-online-game';
import { Colors, Radius, Spacing } from '@/constants/theme';

const COUNTS = [4, 5, 6, 7];

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(id === 'new' ? null : (id ?? null));
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const conn = useRoomConnection(code);
  const { room, members, identity, mySeat, isHost } = conn;

  // 'new' 로 들어오면 방을 만들고 그 코드로 갈아탄다.
  useEffect(() => {
    if (id !== 'new' || code || !identity) return;
    let alive = true;
    setBusy('방을 만드는 중');
    createRoom(identity, { playerCount: 5, highnoon: false, tier: 'medium' })
      .then((made) => {
        if (!alive) return;
        setCode(made);
        router.setParams({ id: made });
      })
      .catch((err) => alive && setLocalError(err.message))
      .finally(() => alive && setBusy(null));
    return () => {
      alive = false;
    };
  }, [id, code, identity, router]);

  // 코드로 들어왔는데 아직 자리가 없으면 앉는다.
  useEffect(() => {
    if (!code || !identity || !room || mySeat !== null) return;
    if (room.status !== 'lobby') return;
    joinRoom(code, identity).catch((err) => setLocalError(err.message));
  }, [code, identity, room, mySeat]);

  // 판이 열리면 게임 화면으로 넘어간다.
  useEffect(() => {
    if (room?.status === 'playing' && code) {
      router.replace({ pathname: '/game/[id]', params: { id: code } });
    }
  }, [room?.status, code, router]);

  if (!isFirebaseConfigured()) {
    return (
      <Notice
        title="온라인 대전이 꺼져 있다"
        body={'.env.example 을 .env 로 복사하고 EXPO_PUBLIC_FIREBASE_* 를 채우면 열린다.'}
        onBack={() => router.replace('/')}
      />
    );
  }

  const error = localError ?? conn.error;
  if (error) {
    return <Notice title="문제가 생겼다" body={error} onBack={() => router.replace('/')} />;
  }

  if (!room || !identity) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.highlight} />
        <Text style={styles.loadingText}>{busy ?? '방에 들어가는 중'}</Text>
      </View>
    );
  }

  const now = Date.now();
  const seated = room.seats.filter((s) => s.uid).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLabel}>방 코드</Text>
        <Text style={styles.code}>{room.code}</Text>
        <Text style={styles.codeHint}>친구에게 이 코드를 알려 주면 들어온다.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>자리 ({seated}/{room.playerCount})</Text>
        {room.seats.map((seat, i) => {
          const member = seat.uid ? members[seat.uid] : null;
          const online = member ? now - member.lastSeen < PRESENCE_TIMEOUT_MS : false;
          return (
            <View key={i} style={styles.seatRow}>
              <Text style={styles.seatIndex}>{i + 1}</Text>
              <Text style={[styles.seatName, !seat.uid && styles.seatEmpty]}>
                {seat.uid ? member?.nick || seat.nick : '비어 있음 → AI가 앉는다'}
              </Text>
              {seat.uid === identity.uid && <Text style={styles.seatBadge}>나</Text>}
              {seat.uid === room.hostUid && <Text style={styles.seatBadge}>호스트</Text>}
              {seat.uid && (
                <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
              )}
            </View>
          );
        })}
      </View>

      {isHost ? (
        <>
          <Setting title="인원">
            {COUNTS.map((n) => (
              <Chip
                key={n}
                label={`${n}인`}
                active={room.playerCount === n}
                onPress={() => updateRoomSettings(room.code, { playerCount: n })}
              />
            ))}
          </Setting>

          <Setting title="빈 자리 AI 난이도">
            {AI_TIERS.map((t: AiTier) => (
              <Chip
                key={t}
                label={AI_TIER_LABEL[t]}
                active={room.tier === t}
                onPress={() => updateRoomSettings(room.code, { tier: t })}
              />
            ))}
          </Setting>

          <Setting title="확장판">
            <Chip
              label="기본"
              active={!room.highnoon}
              onPress={() => updateRoomSettings(room.code, { highnoon: false })}
            />
            <Chip
              label="하이 눈"
              active={room.highnoon}
              onPress={() => updateRoomSettings(room.code, { highnoon: true })}
            />
          </Setting>

          <Pressable
            style={styles.start}
            accessibilityRole="button"
            accessibilityLabel="판 열기"
            onPress={() => markStarted(room.code).catch((err) => setLocalError(err.message))}>
            <Text style={styles.startText}>판 열기</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.waiting}>호스트가 판을 열기를 기다리는 중</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="나가기"
        onPress={async () => {
          await leaveRoom(room.code, identity.uid).catch(() => {});
          router.replace('/');
        }}>
        <Text style={styles.back}>나가기</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닉네임 바꾸기"
        onPress={async () => {
          const next = `총잡이 ${Math.floor(Math.random() * 900 + 100)}`;
          await setNickname(next);
          const id2 = await getIdentity();
          if (code) await joinRoom(code, id2).catch(() => {});
        }}>
        <Text style={styles.back}>닉네임 바꾸기</Text>
      </Pressable>
    </ScrollView>
  );
}

function Notice({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.loading}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeBody}>{body}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="돌아가기" onPress={onBack}>
        <Text style={styles.back}>돌아가기</Text>
      </Pressable>
    </View>
  );
}

function Setting({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    backgroundColor: Colors.background,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.background,
    padding: Spacing.four,
  },
  loadingText: { color: Colors.textMuted, fontSize: 13 },
  noticeTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  noticeBody: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 420 },
  codeBlock: { alignItems: 'center', gap: 4 },
  codeLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  code: { color: Colors.highlight, fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  codeHint: { color: Colors.textMuted, fontSize: 12 },
  section: { gap: Spacing.two },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seatIndex: { color: Colors.textMuted, fontSize: 12, width: 16 },
  seatName: { color: Colors.text, fontSize: 14, flex: 1 },
  seatEmpty: { color: Colors.textMuted, fontStyle: 'italic' },
  seatBadge: {
    color: Colors.sheriff,
    fontSize: 10,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: Colors.sheriff,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: Colors.success },
  dotOffline: { backgroundColor: Colors.border },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.cardBrown, borderColor: Colors.highlight },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: Colors.paper },
  start: {
    backgroundColor: Colors.cardBrown,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.highlight,
  },
  startText: { color: Colors.paper, fontSize: 18, fontWeight: '900' },
  waiting: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  back: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
});
