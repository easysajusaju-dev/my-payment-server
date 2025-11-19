// lib/sajuEngine.ts
// 이지사주 전용 사주 엔진 v1 (대운 + 십성 + 십이운성 + 신살 + 격국/용신 러프판정)

export type Stem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type Branch =
  | "子"
  | "丑"
  | "寅"
  | "卯"
  | "辰"
  | "巳"
  | "午"
  | "未"
  | "申"
  | "酉"
  | "戌"
  | "亥";

export type Gender = "M" | "F";

export type FiveElement = "木" | "火" | "土" | "金" | "水";

export type TenGod =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

export type TwelveStage =
  | "절"
  | "태"
  | "양"
  | "장생"
  | "목욕"
  | "관대"
  | "건록"
  | "제왕"
  | "쇠"
  | "병"
  | "사"
  | "묘";

// 간단 신살 이름 타입 (필요하면 계속 추가)
export type ShinsalName =
  | "도화"
  | "홍염"
  | "천을귀인"
  | "문창"
  | "역마"
  | "화개"
  | "괴강"
  | "공망";

export interface ShinsalItem {
  name: ShinsalName;
  on: ("년" | "월" | "일" | "시")[]; // 어떤 기둥에 발동했는지
}

export interface SolarTerm {
  name: string;
  date: string; // ISO
  isPrincipal: boolean; // 월초절기(정절기)
}

export interface RawChartInput {
  gender: Gender;
  birth: Date;
  yearStem: Stem;
  yearBranch: Branch;
  monthStem: Stem;
  monthBranch: Branch;
  dayStem: Stem;
  dayBranch: Branch;
  hourStem: Stem;
  hourBranch: Branch;
  solarTerms: SolarTerm[];
}

export interface Pillar {
  stem: Stem;
  branch: Branch;
}

export interface TenGodSet {
  year: TenGod;
  month: TenGod;
  daySelf: "일간";
  hour: TenGod;
}

export interface TwelveStageSet {
  year: TwelveStage;
  month: TwelveStage;
  day: TwelveStage;
  hour: TwelveStage;
}

export interface ElementScore {
  element: FiveElement;
  score: number;
}

export interface DaewoonItem {
  index: number;
  startAge: number;
  pillar: Pillar;
}

export interface GyeokgukResult {
  type: string; // 예: "정관격", "재격", "인수격", "식상격", "혼잡격" 등
  focusElement: FiveElement | null; // 격이 집중되는 오행
  comment: string; // 간단 설명
}

export interface YongsinResult {
  main: FiveElement | null;
  candidates: FiveElement[];
  comment: string;
}

export interface SajuReport {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  gender: Gender;
  birth: Date;
  tenGods: TenGodSet;
  twelveStages: TwelveStageSet;
  elementScores: ElementScore[];
  isShinGang: boolean;
  daewoonStartAge: number;
  daewoonList: DaewoonItem[];
  shinsalList: ShinsalItem[];
  gyeokguk: GyeokgukResult;
  yongsin: YongsinResult;
}

// ─────────────────────────────────────────
// 1. 기초 테이블: 오행 / 음양 / 십성
// ─────────────────────────────────────────

const stemElementMap: Record<Stem, FiveElement> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const stemYinYangMap: Record<Stem, "陽" | "陰"> = {
  甲: "陽",
  乙: "陰",
  丙: "陽",
  丁: "陰",
  戊: "陽",
  己: "陰",
  庚: "陽",
  辛: "陰",
  壬: "陽",
  癸: "陰",
};

const branchElementMap: Record<Branch, FiveElement> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "금" as FiveElement, // 오타 방지용으로 아래 한 번 더 지정
  酉: "금" as FiveElement,
  戌: "土",
  亥: "水",
};
// 위 두 줄 수정
branchElementMap["申"] = "金";
branchElementMap["酉"] = "金";

const elementGenerateMap: Record<FiveElement, FiveElement> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const elementControlMap: Record<FiveElement, FiveElement> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

function getTenGod(dayStem: Stem, targetStem: Stem): TenGod {
  const dayElement = stemElementMap[dayStem];
  const targetElement = stemElementMap[targetStem];
  const sameYinYang =
    stemYinYangMap[dayStem] === stemYinYangMap[targetStem];

  if (dayElement === targetElement) {
    return sameYinYang ? "비견" : "겁재";
  }

  if (elementGenerateMap[dayElement] === targetElement) {
    return sameYinYang ? "식신" : "상관";
  }

  if (elementGenerateMap[targetElement] === dayElement) {
    return sameYinYang ? "정인" : "편인";
  }

  if (elementControlMap[dayElement] === targetElement) {
    return sameYinYang ? "정재" : "편재";
  }

  if (elementControlMap[targetElement] === dayElement) {
    return sameYinYang ? "정관" : "편관";
  }

  return "비견";
}

// ─────────────────────────────────────────
// 2. 십이운성
// ─────────────────────────────────────────

const twelveStageOrder: TwelveStage[] = [
  "장생",
  "목욕",
  "관대",
  "건록",
  "제왕",
  "쇠",
  "병",
  "사",
  "묘",
  "절",
  "태",
  "양",
];

const dayStemBirthBranchMap: Record<Stem, Branch> = {
  甲: "亥",
  乙: "午",
  丙: "寅",
  丁: "酉",
  戊: "寅",
  己: "酉",
  庚: "巳",
  辛: "子",
  壬: "申",
  癸: "卯",
};

const branchOrder: Branch[] = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
];

function getTwelveStage(dayStem: Stem, targetBranch: Branch): TwelveStage {
  const birthBranch = dayStemBirthBranchMap[dayStem];
  const startIndex = branchOrder.indexOf(birthBranch);
  const targetIndex = branchOrder.indexOf(targetBranch);
  if (startIndex === -1 || targetIndex === -1) return "묘";

  let diff = targetIndex - startIndex;
  if (diff < 0) diff += 12;
  return twelveStageOrder[diff % 12];
}

// ─────────────────────────────────────────
// 3. 오행 점수 / 신강·신약
// ─────────────────────────────────────────

function calcElementScores(pillars: {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}): ElementScore[] {
  const scores: Record<FiveElement, number> = {
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0,
  };

  const all = [pillars.year, pillars.month, pillars.day, pillars.hour];

  for (const p of all) {
    scores[stemElementMap[p.stem]] += 1.5; // 천간 가중치
    scores[branchElementMap[p.branch]] += 1;
  }

  return (Object.keys(scores) as FiveElement[]).map((el) => ({
    element: el,
    score: scores[el],
  }));
}

function isShinGang(dayStem: Stem, scores: ElementScore[]): boolean {
  const dayElement = stemElementMap[dayStem];
  const total = scores.reduce((s, e) => s + e.score, 0);
  const myScore = scores.find((e) => e.element === dayElement)?.score ?? 0;
  return myScore / (total || 1) >= 0.32; // 대략 32% 이상이면 신강
}

// ─────────────────────────────────────────
// 4. 대운 시작나이 & 리스트
// ─────────────────────────────────────────

function isYangYearStem(stem: Stem): boolean {
  return stemYinYangMap[stem] === "陽";
}

/**
 * 순행/역행
 * - 남자 + 양년, 여자 + 음년 => 순행
 * - 남자 + 음년, 여자 + 양년 => 역행
 */
function isForwardDaewoon(gender: Gender, yearStem: Stem): boolean {
  const yangYear = isYangYearStem(yearStem);
  if (gender === "M") return yangYear;
  return !yangYear;
}

function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function calcDaewoonStartAge(input: RawChartInput): number {
  const { birth, gender, yearStem, solarTerms } = input;
  const principal = solarTerms
    .filter((s) => s.isPrincipal)
    .map((s) => ({ ...s, d: new Date(s.date) }))
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  if (!principal.length) return 0;

  const forward = isForwardDaewoon(gender, yearStem);

  let prev = principal[0];
  let next = principal[principal.length - 1];

  for (const p of principal) {
    if (p.d.getTime() <= birth.getTime()) prev = p;
    if (p.d.getTime() > birth.getTime()) {
      next = p;
      break;
    }
  }

  const baseTerm = forward ? next : prev;
  const days = Math.abs(diffDays(birth, baseTerm.d));
  return days / 3; // 일수/3 = 대운수(나이)
}

const stems: Stem[] = [
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸",
];

const branches: Branch[] = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
];

function findStemIndex(stem: Stem): number {
  return stems.indexOf(stem);
}

function findBranchIndex(branch: Branch): number {
  return branches.indexOf(branch);
}

function shiftPillar(p: Pillar, step: number): Pillar {
  const sIdx = findStemIndex(p.stem);
  const bIdx = findBranchIndex(p.branch);
  return {
    stem: stems[(sIdx + step + 10) % 10],
    branch: branches[(bIdx + step + 12) % 12],
  };
}

function buildDaewoonList(
  monthPillar: Pillar,
  startAge: number,
  forward: boolean,
  count = 8,
): DaewoonItem[] {
  const list: DaewoonItem[] = [];
  for (let i = 0; i < count; i++) {
    const step = i + 1; // 1대운 당 1간지 이동
    const pillar = shiftPillar(monthPillar, forward ? step : -step);
    list.push({
      index: i + 1,
      startAge: Math.floor(startAge) + i * 10,
      pillar,
    });
  }
  return list;
}

// ─────────────────────────────────────────
// 5. 신살 계산 (대표 몇 개)
// ─────────────────────────────────────────

/**
 * 도화: 년지 기준
 * - 子년생: 卯
 * - 午년생: 酉
 * - 卯년생: 子
 * - 酉년생: 午
 */
const dohwaMap: Partial<Record<Branch, Branch>> = {
  子: "卯",
  午: "酉",
  卯: "子",
  酉: "午",
};

/**
 * 홍염: 일지 기준
 * - 寅午戌 일생: 卯
 * - 申子辰 일생: 酉
 * - 巳酉丑 일생: 午
 * - 亥卯未 일생: 子
 */
function calcHongyeom(dayBranch: Branch, targets: Branch[]): boolean[] {
  let star: Branch | null = null;
  if (["寅", "午", "戌"].includes(dayBranch)) star = "卯";
  else if (["申", "子", "辰"].includes(dayBranch)) star = "酉";
  else if (["巳", "酉", "丑"].includes(dayBranch)) star = "午";
  else if (["亥", "卯", "未"].includes(dayBranch)) star = "子";

  return targets.map((b) => star !== null && b === star);
}

/**
 * 천을귀인: 년간/일간 기준 (간별 정표)
 *  - 甲己: 丑未
 *  - 乙庚: 子申
 *  - 丙辛: 亥酉
 *  - 丁壬: 戌亥
 *  - 戊癸: 丑亥 (등 여러 판본, 여기선 대표판)
 */
const cheoneulMap: Partial<Record<Stem, Branch[]>> = {
  甲: ["丑", "未"],
  己: ["丑", "未"],
  乙: ["子", "申"],
  庚: ["子", "申"],
  丙: ["亥", "酉"],
  辛: ["亥", "酉"],
  丁: ["戌", "亥"],
  壬: ["戌", "亥"],
  戊: ["丑", "亥"],
  癸: ["丑", "亥"],
};

/**
 * 문창: 년간 기준 (간별)
 *  - 甲己: 巳
 *  - 乙庚: 午
 *  - 丙辛: 申
 *  - 丁壬: 酉
 *  - 戊癸: 亥
 */
const munchangMap: Partial<Record<Stem, Branch>> = {
  甲: "巳",
  己: "巳",
  乙: "午",
  庚: "午",
  丙: "申",
  辛: "申",
  丁: "酉",
  壬: "酉",
  戊: "亥",
  癸: "亥",
};

/**
 * 역마: 년지 기준
 *  - 寅午戌: 申
 *  - 申子辰: 寅
 *  - 巳酉丑: 亥
 *  - 亥卯未: 巳
 */
function calcYeokma(yearBranch: Branch, targets: Branch[]): boolean[] {
  let star: Branch | null = null;
  if (["寅", "午", "戌"].includes(yearBranch)) star = "申";
  else if (["申", "子", "辰"].includes(yearBranch)) star = "寅";
  else if (["巳", "酉", "丑"].includes(yearBranch)) star = "亥";
  else if (["亥", "卯", "未"].includes(yearBranch)) star = "巳";
  return targets.map((b) => star !== null && b === star);
}

/**
 * 화개: 년지 기준
 *  - 申子辰: 辰
 *  - 寅午戌: 戌
 *  - 亥卯未: 未
 *  - 巳酉丑: 丑
 */
function calcHwage(yearBranch: Branch, targets: Branch[]): boolean[] {
  let star: Branch | null = null;
  if (["申", "子", "辰"].includes(yearBranch)) star = "辰";
  else if (["寅", "午", "戌"].includes(yearBranch)) star = "戌";
  else if (["亥", "卯", "未"].includes(yearBranch)) star = "未";
  else if (["巳", "酉", "丑"].includes(yearBranch)) star = "丑";
  return targets.map((b) => star !== null && b === star);
}

/**
 * 괴강: 년간 기준
 *  - 甲: 庚辰
 *  - 乙: 辛巳
 *  - 丙: 壬午
 *  - 丁: 癸未
 *  - 戊: 甲申
 *  - 己: 乙酉
 *  - 庚: 丙戌
 *  - 辛: 丁亥
 *  - 壬: 戊子
 *  - 癸: 己丑
 * 여기선 "년간+일지" 조합만 간단 체크 (실전판과 다를 수 있음)
 */
const gwegangMap: Partial<Record<Stem, Branch>> = {
  甲: "辰",
  乙: "巳",
  丙: "午",
  丁: "未",
  戊: "申",
  己: "酉",
  庚: "戌",
  辛: "亥",
  壬: "子",
  癸: "丑",
};

// 공망 (예: 일주 기준 12지지 공망) – 여기선 간단히 연지/일지 조합으로만 처리
// 실제 공망판은 훨씬 복잡하므로, 필요시 이후 교체.
const kongMangPairs: [Branch, Branch][] = [
  ["子", "丑"],
  ["寅", "卯"],
  ["辰", "巳"],
  ["午", "未"],
  ["申", "酉"],
  ["戌", "亥"],
];

function hasKongMang(yearBranch: Branch, targetBranch: Branch): boolean {
  return kongMangPairs.some(
    ([a, b]) =>
      (a === yearBranch && b === targetBranch) ||
      (b === yearBranch && a === targetBranch),
  );
}

function buildShinsal(
  input: RawChartInput,
): ShinsalItem[] {
  const { yearStem, yearBranch, dayStem, dayBranch } = input;

  const pillars = {
    년: { branch: yearBranch },
    월: { branch: input.monthBranch },
    일: { branch: dayBranch },
    시: { branch: input.hourBranch },
  };

  const order: ("년" | "월" | "일" | "시")[] = ["년", "월", "일", "시"];
  const branches = order.map((k) => pillars[k].branch);

  const result: ShinsalItem[] = [];

  // 도화
  const dohwaBranch = dohwaMap[yearBranch];
  if (dohwaBranch) {
    const on: ("년" | "월" | "일" | "시")[] = [];
    order.forEach((k, i) => {
      if (branches[i] === dohwaBranch) on.push(k);
    });
    if (on.length) result.push({ name: "도화", on });
  }

  // 홍염
  const hongArr = calcHongyeom(dayBranch, branches);
  if (hongArr.some(Boolean)) {
    const on = order.filter((_, i) => hongArr[i]);
    result.push({ name: "홍염", on });
  }

  // 천을귀인
  const cheoneulBranches = cheoneulMap[yearStem] ?? [];
  if (cheoneulBranches.length) {
    const on: ("년" | "월" | "일" | "시")[] = [];
    order.forEach((k, i) => {
      if (cheoneulBranches.includes(branches[i])) on.push(k);
    });
    if (on.length) result.push({ name: "천을귀인", on });
  }

  // 문창
  const mch = munchangMap[yearStem];
  if (mch) {
    const on: ("년" | "월" | "일" | "시")[] = [];
    order.forEach((k, i) => {
      if (branches[i] === mch) on.push(k);
    });
    if (on.length) result.push({ name: "문창", on });
  }

  // 역마
  const yeokArr = calcYeokma(yearBranch, branches);
  if (yeokArr.some(Boolean)) {
    const on = order.filter((_, i) => yeokArr[i]);
    result.push({ name: "역마", on });
  }

  // 화개
  const hwaArr = calcHwage(yearBranch, branches);
  if (hwaArr.some(Boolean)) {
    const on = order.filter((_, i) => hwaArr[i]);
    result.push({ name: "화개", on });
  }

  // 괴강 (년간 + 일지 기준 간단판)
  const gBranch = gwegangMap[yearStem];
  if (gBranch && dayBranch === gBranch) {
    result.push({ name: "괴강", on: ["일"] });
  }

  // 공망 (년지와 월/일/시지 공망 여부 간단체크)
  const kongOn: ("년" | "월" | "일" | "시")[] = [];
  order.forEach((k, i) => {
    if (hasKongMang(yearBranch, branches[i])) kongOn.push(k);
  });
  if (kongOn.length) result.push({ name: "공망", on: kongOn });

  return result;
}

// ─────────────────────────────────────────
// 6. 격국 & 용신 (러프판정 버전)
// ─────────────────────────────────────────

function detectGyeokguk(
  input: RawChartInput,
  tenGods: TenGodSet,
): GyeokgukResult {
  const monthTen = tenGods.month;
  const focusElement = stemElementMap[input.monthStem];

  if (monthTen === "정관" || monthTen === "편관") {
    return {
      type: "관격",
      focusElement,
      comment: "월간이 관성 위주라 규율·명예·직업운 중심의 격으로 볼 수 있어요.",
    };
  }
  if (monthTen === "정재" || monthTen === "편재") {
    return {
      type: "재격",
      focusElement,
      comment:
        "월간이 재성 위주라 현실·돈·실리 중심의 격으로 볼 수 있어요.",
    };
  }
  if (monthTen === "정인" || monthTen === "편인") {
    return {
      type: "인수격",
      focusElement,
      comment:
        "월간이 인성 위주라 공부·생각·지원·정신세계 중심의 격에 가깝습니다.",
    };
  }
  if (monthTen === "식신" || monthTen === "상관") {
    return {
      type: "식상격",
      focusElement,
      comment:
        "월간이 식상 위주라 표현력·창작·말·아이디어 중심의 격으로 볼 수 있어요.",
    };
  }
  if (monthTen === "비견" || monthTen === "겁재") {
    return {
      type: "비겁격",
      focusElement,
      comment:
        "월간이 비겁 위주라 독립성·경쟁·자기주도성이 강한 편입니다.",
    };
  }

  return {
    type: "혼잡격",
    focusElement: null,
    comment:
      "월간에서 단일 십성이 뚜렷하게 드러나지 않아 여러 기운이 섞인 혼잡격으로 볼 수 있어요.",
  };
}

function detectYongsin(
  input: RawChartInput,
  scores: ElementScore[],
  gyeokguk: GyeokgukResult,
): YongsinResult {
  const dayElement = stemElementMap[input.dayStem];
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0].score;
  const minScore = sorted[sorted.length - 1].score;

  const commentBase: string[] = [];

  // 신강/신약 기준으로 조합
  const isStrong = isShinGang(input.dayStem, scores);

  let main: FiveElement | null = null;
  const candidates: FiveElement[] = [];

  if (isStrong) {
    // 신강이면: 일간을 누르고 조절하는 것(관성·식상·재성) 위주
    const controlEl = elementControlMap[dayElement];
    main = controlEl;
    candidates.push(controlEl);
    // 너무 강한 오행과 상극되는 것(극하는 오행)도 후보
    const extreme = sorted.filter((e) => e.score === maxScore)[0].element;
    const toWeaken = elementControlMap[extreme];
    if (!candidates.includes(toWeaken)) candidates.push(toWeaken);
    commentBase.push("전체적으로 신강한 편이라, 일간을 적당히 누르고 쓰게 해주는 오행을 용신으로 봅니다.");
  } else {
    // 신약이면: 일간을 생해주는 인성·비겁 위주
    const generator = Object.entries(elementGenerateMap).find(
      ([, v]) => v === dayElement,
    )?.[0] as FiveElement | undefined;
    if (generator) {
      main = generator;
      candidates.push(generator);
    }
    const same = dayElement;
    if (!candidates.includes(same)) candidates.push(same);
    commentBase.push("전체적으로 신약한 편이라, 일간을 도와주고 키워주는 오행을 용신으로 봅니다.");
  }

  // 격국 오행도 참고 (gyeokguk.focusElement)
  if (gyeokguk.focusElement && !candidates.includes(gyeokguk.focusElement)) {
    candidates.push(gyeokguk.focusElement);
    commentBase.push("격국에서 강조되는 오행도 보조 용신 후보로 함께 참고할 수 있습니다.");
  }

  // 가장 낮은 오행도 과소보완 후보
  const weakEl = sorted.filter((e) => e.score === minScore)[0].element;
  if (!candidates.includes(weakEl)) candidates.push(weakEl);

  if (!main && candidates.length) main = candidates[0];

  return {
    main,
    candidates,
    comment: commentBase.join(" "),
  };
}

// ─────────────────────────────────────────
// 7. 최종 보고서 생성
// ─────────────────────────────────────────

export function buildSajuReport(input: RawChartInput): SajuReport {
  const pillars = {
    year: { stem: input.yearStem, branch: input.yearBranch },
    month: { stem: input.monthStem, branch: input.monthBranch },
    day: { stem: input.dayStem, branch: input.dayBranch },
    hour: { stem: input.hourStem, branch: input.hourBranch },
  };

  // 십성
  const tenGods: TenGodSet = {
    year: getTenGod(input.dayStem, input.yearStem),
    month: getTenGod(input.dayStem, input.monthStem),
    daySelf: "일간",
    hour: getTenGod(input.dayStem, input.hourStem),
  };

  // 십이운성
  const twelveStages: TwelveStageSet = {
    year: getTwelveStage(input.dayStem, input.yearBranch),
    month: getTwelveStage(input.dayStem, input.monthBranch),
    day: getTwelveStage(input.dayStem, input.dayBranch),
    hour: getTwelveStage(input.dayStem, input.hourBranch),
  };

  // 오행 점수
  const elementScores = calcElementScores(pillars);
  const shinGang = isShinGang(input.dayStem, elementScores);

  // 대운
  const daewoonStartAge = calcDaewoonStartAge(input);
  const forward = isForwardDaewoon(input.gender, input.yearStem);
  const daewoonList = buildDaewoonList(
    pillars.month,
    daewoonStartAge,
    forward,
  );

  // 신살
  const shinsalList = buildShinsal(input);

  // 격국
  const gyeokguk = detectGyeokguk(input, tenGods);

  // 용신
  const yongsin = detectYongsin(input, elementScores, gyeokguk);

  return {
    pillars,
    gender: input.gender,
    birth: input.birth,
    tenGods,
    twelveStages,
    elementScores,
    isShinGang: shinGang,
    daewoonStartAge,
    daewoonList,
    shinsalList,
    gyeokguk,
    yongsin,
  };
}
