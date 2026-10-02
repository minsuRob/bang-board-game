/**
 * 판이 흐른 시간. 오른쪽 위, 진행 기록 옆에 붙는다.
 *
 * 시간은 화면(게임 화면)이 가진 스톱워치에 쌓이고, 이 표시는 읽기만 한다.
 * 창 크기가 바뀌어 배치가 갈리면서 표시가 새로 붙어도 시간이 0 으로 돌아가지 않게 하려는 것이다.
 * `running` 이 false 인 동안(일시정지·결과)은 멈추고, 멈춘 시간은 세지 않는다.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useToolbarStyles } from './theme/toolbar';
import { useColors } from './theme/use-theme';

export type Stopwatch = {
  /** 흐른 밀리초. 멈춘 동안은 늘지 않는다 */
  elapsed: () => number;
  running: () => boolean;
};

/**
 * 다시 그려도 같은 스톱워치를 준다. 켜고 끄는 것만으로는 화면을 다시 그리지 않는다
 * baseMs 는 저장본에서 이어 볼 때 이미 흐른 시간이다. 바뀌면 그 값부터 다시 센다.
 */
export function useStopwatch(running: boolean, baseMs = 0): Stopwatch {
  const acc = useRef(baseMs);
  const since = useRef<number | null>(null);
  const [watch] = useState<Stopwatch>(() => ({
    elapsed: () => acc.current + (since.current === null ? 0 : Date.now() - since.current),
    running: () => since.current !== null,
  }));

  useEffect(() => {
    acc.current = baseMs;
    if (since.current !== null) since.current = Date.now();
  }, [baseMs]);

  useEffect(() => {
    if (!running) return;
    since.current = Date.now();
    return () => {
      if (since.current !== null) acc.current += Date.now() - since.current;
      since.current = null;
    };
  }, [running]);

  return watch;
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type Props = {
  stopwatch: Stopwatch;
  style?: StyleProp<ViewStyle>;
};

export function GameClock({ stopwatch, style }: Props) {
  const toolbar = useToolbarStyles();
  const c = useColors();
  const read = () => ({ ms: stopwatch.elapsed(), running: stopwatch.running() });
  const [now, setNow] = useState(read);

  useEffect(() => {
    const id = setInterval(() => setNow(read()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopwatch]);

  const label = formatElapsed(now.ms);
  return (
    <View
      style={[toolbar.pill, styles.root, !now.running && { borderColor: c.highlight }, style]}
      accessibilityRole="timer"
      accessibilityLabel={`흐른 시간 ${label}${now.running ? '' : ', 멈춤'}`}>
      <Text style={[toolbar.text, styles.text, !now.running && { color: c.highlight }]}>⏱ {label}</Text>
    </View>
  );
}

// 알약 모양은 위쪽 버튼 줄과 같다. 멈추면 테두리와 글자가 금빛(라이트는 짙은 황토)이 된다.
const styles = StyleSheet.create({
  root: { pointerEvents: 'none' },
  text: { fontVariant: ['tabular-nums'] },
});
