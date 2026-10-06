import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { AI_TIERS } from '@/game/ai';
import type { AiTier } from '@/game/ai/types';
import { getIdentity, setNickname } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/config';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  markStarted,
  presenceOf,
  roomEventExpansion,
  updateRoomSettings,
} from '@/firebase/rooms';
import { EVENT_EXPANSIONS } from '@/game/data/events';
import { useRoomConnection } from '@/game/store/use-online-game';
import { Chip } from '@/game/ui/Chip';
import { MenuBackdrop } from '@/game/ui/menu/MenuBackdrop';
import { InkLink, PaperSection, PaperSheet, StampButton, usePaperText } from '@/game/ui/menu/PaperUi';
import { WesternFonts } from '@/game/ui/menu/western-fonts';
import { PRESENCE_LABEL, PresenceDot, presenceColor } from '@/game/ui/PresenceDot';
import { themedStyles, useColors } from '@/game/ui/theme/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { useT } from '@/i18n/use-t';
import { useNames } from '@/i18n/use-names';

const COUNTS = [4, 5, 6, 7];

export default function RoomScreen() {
  const names = useNames();
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT().routes.room;
  const router = useRouter();
  const styles = useStyles();
  const paperText = usePaperText();
  const c = useColors();
  const [code, setCode] = useState<string | null>(id === 'new' ? null : (id ?? null));
  const [localError, setLocalError] = useState<string | null>(null);
  // 존재 표시등을 다시 그리기 위한 시계. 렌더 중에 Date.now() 를 부르면 안 된다.
  const [now, setNow] = useState(() => Date.now());

  const conn = useRoomConnection(code, { signIn: true });
  const { room, members, identity, mySeat, isHost } = conn;

  // 'new' 로 들어오면 방을 만들고 그 코드로 갈아탄다.
  useEffect(() => {
    if (id !== 'new' || code || !identity) return;
    let alive = true;
    createRoom(identity, { playerCount: 5, eventExpansion: null, tier: 'medium' })
      .then((made) => {
        if (!alive) return;
        setCode(made);
        // 주소를 방 코드로 바꿔 둔다. /room/new 에 남으면 새로고침할 때 방이 또 생긴다.
        router.replace({ pathname: '/room/[id]', params: { id: made } });
      })
      .catch((err) => alive && setLocalError(err.message));
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

  // 접속 표시등을 2초마다 다시 그린다. 소식이 끊겨 빨강으로 바뀌는 것은 시간만 알려 준다.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 2_000);
    return () => clearInterval(timer);
  }, []);

  // 판이 열리면 게임 화면으로 넘어간다.
  useEffect(() => {
    if (room?.status === 'playing' && code) {
      router.replace({ pathname: '/game/[id]', params: { id: code } });
    }
  }, [room?.status, code, router]);

  if (!isFirebaseConfigured()) {
    return (
      <Notice
        title={t.offTitle}
        body={t.offBody}
        onBack={() => router.replace('/')}
      />
    );
  }

  const error = localError ?? conn.error;
  if (error) {
    return <Notice title={t.errorTitle} body={error} onBack={() => router.replace('/')} />;
  }

  if (!room || !identity) {
    return (
      <View style={styles.screen}>
        <MenuBackdrop veil={0.55} />
        <View style={styles.loading}>
          <ActivityIndicator color={c.highlight} />
          <Text style={styles.loadingText}>
            {id === 'new' && !code ? t.creating : t.joining}
          </Text>
        </View>
      </View>
    );
  }

  const seated = room.seats.filter((s) => s.uid).length;

  return (
    <View style={styles.screen}>
      <MenuBackdrop veil={0.55} />
      <ScrollView contentContainerStyle={styles.container}>
        <PaperSheet>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>{t.codeLabel}</Text>
            <Text style={styles.code} accessibilityRole="header">
              {room.code}
            </Text>
            <View style={styles.doubleRule} />
            <Text style={paperText.hint}>{t.codeHint}</Text>
          </View>

          <PaperSection title={t.seats(seated, room.playerCount)}>
            {room.seats.map((seat, i) => {
              const member = seat.uid ? members[seat.uid] : undefined;
              const presence = seat.uid ? presenceOf(member, now) : null;
              return (
                <View key={i} style={styles.seatRow}>
                  <Text style={styles.seatIndex}>{i + 1}</Text>
                  <PresenceDot presence={presence} size={10} />
                  <Text style={[styles.seatName, !seat.uid && styles.seatEmpty]}>
                    {seat.uid ? member?.nick || seat.nick : t.emptySeat}
                  </Text>
                  {seat.uid === identity.uid && <Text style={styles.seatBadge}>{t.me}</Text>}
                  {seat.uid === room.hostUid && <Text style={styles.seatBadge}>{t.host}</Text>}
                  {presence && (
                    <Text style={[styles.presenceText, { color: presenceColor(c, presence) }]}>
                      {PRESENCE_LABEL[presence]}
                    </Text>
                  )}
                </View>
              );
            })}
          </PaperSection>

          {isHost ? (
            <>
              <Setting title={t.players}>
                {COUNTS.map((n) => (
                  <Chip
                    key={n}
                    label={t.playerCount(n)}
                    active={room.playerCount === n}
                    onPress={() => updateRoomSettings(room.code, { playerCount: n })}
                  />
                ))}
              </Setting>

              <Setting title={t.aiTier}>
                {AI_TIERS.map((x: AiTier) => (
                  <Chip
                    key={x}
                    label={names.aiTier(x)}
                    active={room.tier === x}
                    onPress={() => updateRoomSettings(room.code, { tier: x })}
                  />
                ))}
              </Setting>

              <Setting title={t.eventExpansion}>
                <Chip
                  label={t.eventBase}
                  active={roomEventExpansion(room) === null}
                  onPress={() => updateRoomSettings(room.code, { eventExpansion: null })}
                />
                {EVENT_EXPANSIONS.map((x) => (
                  <Chip
                    key={x}
                    label={names.expansionName(x)}
                    active={roomEventExpansion(room) === x}
                    onPress={() => updateRoomSettings(room.code, { eventExpansion: x })}
                  />
                ))}
              </Setting>

              <Setting title={t.cardExpansion}>
                <Text style={[paperText.hint, styles.fullWidth]}>{t.cardExpansionHint}</Text>
                <Chip
                  label={t.off}
                  active={!room.valley}
                  onPress={() => updateRoomSettings(room.code, { valley: false })}
                />
                <Chip
                  label={t.on}
                  active={Boolean(room.valley)}
                  onPress={() => updateRoomSettings(room.code, { valley: true })}
                />
              </Setting>

              <Setting title={t.deadChat}>
                <Chip
                  label={t.allow}
                  active={room.deadChat !== false}
                  onPress={() => updateRoomSettings(room.code, { deadChat: true })}
                />
                <Chip
                  label={t.readOnly}
                  active={room.deadChat === false}
                  onPress={() => updateRoomSettings(room.code, { deadChat: false })}
                />
              </Setting>

              <StampButton
                label={t.open}
                onPress={() => markStarted(room.code).catch((err) => setLocalError(err.message))}
              />
            </>
          ) : (
            <Text style={styles.waiting}>{t.waitingHost}</Text>
          )}

          <View style={styles.links}>
            <InkLink
              label={t.leave}
              onPress={async () => {
                await leaveRoom(room.code, identity.uid).catch(() => {});
                router.replace('/');
              }}
            />
            <InkLink
              label={t.changeNick}
              onPress={async () => {
                const next = `${t.nickPrefix} ${Math.floor(Math.random() * 900 + 100)}`;
                await setNickname(next);
                const id2 = await getIdentity();
                if (code) await joinRoom(code, id2).catch(() => {});
              }}
            />
          </View>
        </PaperSheet>
      </ScrollView>
    </View>
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
  const styles = useStyles();
  const paperText = usePaperText();
  const t = useT().routes.room;
  return (
    <View style={styles.screen}>
      <MenuBackdrop veil={0.55} />
      <View style={styles.loading}>
        <PaperSheet style={styles.noticeSheet}>
          <Text style={styles.noticeTitle}>{title}</Text>
          <Text style={[paperText.hint, styles.noticeBody]}>{body}</Text>
          <InkLink label={t.back} onPress={onBack} />
        </PaperSheet>
      </View>
    </View>
  );
}

function Setting({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <PaperSection title={title}>
      <View style={styles.row}>{children}</View>
    </PaperSection>
  );
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  loadingText: { color: c.textMuted, fontSize: 13.5, fontFamily: WesternFonts.body },
  noticeSheet: { alignItems: 'center', gap: Spacing.three, maxWidth: 480 },
  noticeTitle: { color: c.heading, fontSize: 22, fontWeight: '900', textAlign: 'center', fontFamily: WesternFonts.label },
  noticeBody: { textAlign: 'center' },
  // 방 코드는 메뉴 제목 자리에 큰 활자로 찍는다
  codeBlock: { alignItems: 'center', gap: 4 },
  codeLabel: { color: c.textMuted, fontSize: 13, letterSpacing: 4, fontFamily: WesternFonts.label },
  code: {
    color: c.heading,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 10,
    fontFamily: WesternFonts.type,
    fontVariant: ['tabular-nums'],
  },
  doubleRule: {
    alignSelf: 'stretch',
    marginVertical: 4,
    height: 5,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderColor: c.rule,
  },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', alignItems: 'center' },
  fullWidth: { width: '100%' },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: c.field,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: c.rule,
  },
  seatIndex: { color: c.textMuted, fontSize: 12, width: 16, fontFamily: WesternFonts.type },
  seatName: { color: c.text, fontSize: 14.5, fontWeight: '700', flex: 1, fontFamily: WesternFonts.body },
  seatEmpty: { color: c.textMuted, fontStyle: 'italic', fontWeight: '400' },
  seatBadge: {
    color: c.sheriff,
    fontSize: 10.5,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: c.sheriff,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    fontFamily: WesternFonts.label,
  },
  presenceText: { fontSize: 11, fontWeight: '800', minWidth: 52, textAlign: 'right' },
  waiting: { color: c.textMuted, fontSize: 14, textAlign: 'center', fontFamily: WesternFonts.body },
  links: { gap: Spacing.three },
}));
