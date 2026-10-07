import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'pin'
  | 'users'
  | 'history'
  | 'plus'
  | 'arrow'
  | 'chevron'
  | 'flag'
  | 'edit'
  | 'trash'
  | 'check'
  | 'close'
  | 'trophy';

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

/** Line icons, path-for-path from the prototype's inline SVG <Icon>. */
export function Icon({ name, size = 22, strokeWidth = 1.8, color = '#083d40' }: IconProps) {
  const p = (d: string) => <Path key={d} d={d} />;
  const paths: Record<IconName, React.ReactNode> = {
    home: [p('m3 11 9-8 9 8'), p('M5 10v10h14V10M9 20v-6h6v6')],
    pin: [p('M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z'), <Circle key="c" cx={12} cy={10} r={2.5} />],
    users: [
      p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'),
      <Circle key="c" cx={9} cy={7} r={4} />,
      p('M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'),
    ],
    history: [p('M3 12a9 9 0 1 0 3-6.7L3 8'), p('M3 3v5h5M12 7v5l3 2')],
    plus: p('M12 5v14M5 12h14'),
    arrow: p('M5 12h14M13 6l6 6-6 6'),
    chevron: p('m9 18 6-6-6-6'),
    flag: p('M6 21V4M6 5c4-3 8 3 12 0v9c-4 3-8-3-12 0'),
    edit: [p('M12 20h9'), p('M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z')],
    trash: p('M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6'),
    check: p('m5 12 4 4L19 6'),
    close: p('m6 6 12 12M18 6 6 18'),
    trophy: [p('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z'), p('M7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4')],
  };

  return (
    <Svg
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      pointerEvents="none"
    >
      {paths[name]}
    </Svg>
  );
}
