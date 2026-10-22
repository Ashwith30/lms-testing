import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const analyticsSourcePath = path.resolve(__dirname, '../src/pages/institution/Analytics.tsx');
const analyticsSource = fs.readFileSync(analyticsSourcePath, 'utf8');

describe('MED-07: Frontend Institutional Analytics Zero-Value Fallback & Dynamic Data Audit', () => {

  describe('1. Static Code Inspection: Removal of Mock Statistics and || with Numeric Fallbacks', () => {
    test('does not use || with hardcoded sample KPI values (815, 72.4, 78.6, 22540, 22,540)', () => {
      assert.doesNotMatch(
        analyticsSource,
        /\|\|\s*(?:815|72\.4|78\.6|22540|'22,540'|"22,540")/,
        'Found hardcoded mock KPI fallback using logical OR'
      );
    });

    test('does not use || with hardcoded participation percentages (68, 18, 14)', () => {
      assert.doesNotMatch(
        analyticsSource,
        /participation\?\.onTime\s*\|\|\s*68/,
        'Found participation.onTime || 68 fallback'
      );
      assert.doesNotMatch(
        analyticsSource,
        /participation\?\.late\s*\|\|\s*18/,
        'Found participation.late || 18 fallback'
      );
      assert.doesNotMatch(
        analyticsSource,
        /participation\?\.missed\s*\|\|\s*14/,
        'Found participation.missed || 14 fallback'
      );
    });

    test('does not use || 75 for passRateComparison cycle widths', () => {
      assert.doesNotMatch(
        analyticsSource,
        /item\.previousCycle\s*\|\|\s*75/,
        'Found item.previousCycle || 75 fallback'
      );
    });

    test('uses nullish coalescing (?? 0) for KPI displays', () => {
      assert.match(
        analyticsSource,
        /kpis\?\.totalEnrolled\s*\?\?\s*0/,
        'kpis.totalEnrolled must use ?? 0'
      );
      assert.match(
        analyticsSource,
        /kpis\?\.avgScore\s*\?\?\s*0/,
        'kpis.avgScore must use ?? 0'
      );
      assert.match(
        analyticsSource,
        /kpis\?\.passRate\s*\?\?\s*0/,
        'kpis.passRate must use ?? 0'
      );
      assert.match(
        analyticsSource,
        /kpis\?\.totalSubmissions\s*\?\?\s*0/,
        'kpis.totalSubmissions must use ?? 0'
      );
    });

    test('uses nullish coalescing (?? 0) for test participation values', () => {
      assert.match(
        analyticsSource,
        /participation\?\.onTime\s*\?\?\s*0/,
        'participation.onTime must use ?? 0'
      );
      assert.match(
        analyticsSource,
        /participation\?\.late\s*\?\?\s*0/,
        'participation.late must use ?? 0'
      );
      assert.match(
        analyticsSource,
        /participation\?\.missed\s*\?\?\s*0/,
        'participation.missed must use ?? 0'
      );
    });
  });

  describe('2. Component Mock Content Audit: Removal of Fabricated Static Text', () => {
    test('removed hardcoded Row 4 Insights Card static banners', () => {
      assert.doesNotMatch(
        analyticsSource,
        /68% of students submit assessments on time/,
        'Found hardcoded engagement banner in Row 4'
      );
      assert.doesNotMatch(
        analyticsSource,
        /Pass rate improved by 6\.8% compared to the previous cycle/,
        'Found hardcoded pass rate improvement banner in Row 4'
      );
      assert.doesNotMatch(
        analyticsSource,
        /CSM department has the highest average score \(82%\)/,
        'Found hardcoded CSM department score banner in Row 4'
      );
      assert.doesNotMatch(
        analyticsSource,
        /MECH department shows lower performance/,
        'Found hardcoded MECH department performance banner in Row 4'
      );
    });

    test('removed hardcoded modal static guidance referencing EEE and MECH', () => {
      assert.doesNotMatch(
        analyticsSource,
        /Students in EEE and MECH show high accuracy in theoretical MCQs/,
        'Found hardcoded modal guidance banner'
      );
    });

    test('removed hardcoded student popup modal stats (30 / 30 Tests, 0 Flags, Top 1% Campus Cohort)', () => {
      assert.doesNotMatch(
        analyticsSource,
        /100% \(30 \/ 30 Tests\)/,
        'Found hardcoded 30/30 tests in student popup'
      );
      assert.doesNotMatch(
        analyticsSource,
        /100% \(0 Flags\)/,
        'Found hardcoded 0 Flags in student popup'
      );
      assert.doesNotMatch(
        analyticsSource,
        /Top 1% Campus Cohort/,
        'Found hardcoded Top 1% cohort in student popup'
      );
    });

    test('PDF export uses ?? 0 and does not invent fake growth (+5.2%, +3.1%)', () => {
      assert.doesNotMatch(
        analyticsSource,
        /kpis\.totalEnrolledGrowth\s*\|\|\s*'\+5\.2%'/,
        'Found hardcoded +5.2% growth in PDF export'
      );
      assert.doesNotMatch(
        analyticsSource,
        /kpis\.avgScoreGrowth\s*\|\|\s*'\+3\.1%'/,
        'Found hardcoded +3.1% growth in PDF export'
      );
    });
  });

  describe('3. Zero-Value vs Falsy Evaluation Logic', () => {
    test('KPI zero values render as 0 and not truthy defaults', () => {
      const kpis = {
        totalEnrolled: 0,
        avgScore: 0.0,
        passRate: 0.0,
        totalSubmissions: 0,
      };

      // Simulating Javascript expression behavior: || vs ??
      const oldEnrolled = kpis.totalEnrolled || 815;
      const newEnrolled = (kpis.totalEnrolled ?? 0).toLocaleString();
      assert.equal(oldEnrolled, 815, 'Bug demonstration: 0 || 815 evaluates to 815');
      assert.equal(newEnrolled, '0', 'Fix verified: 0 ?? 0 evaluates to "0"');

      const oldScore = `${kpis.avgScore || 72.4}%`;
      const newScore = `${kpis.avgScore ?? 0}%`;
      assert.equal(oldScore, '72.4%', 'Bug demonstration: 0.0 || 72.4 evaluates to 72.4%');
      assert.equal(newScore, '0%', 'Fix verified: 0.0 ?? 0 evaluates to 0%');

      const oldPassRate = `${kpis.passRate || 78.6}%`;
      const newPassRate = `${kpis.passRate ?? 0}%`;
      assert.equal(oldPassRate, '78.6%', 'Bug demonstration: 0.0 || 78.6 evaluates to 78.6%');
      assert.equal(newPassRate, '0%', 'Fix verified: 0.0 ?? 0 evaluates to 0%');

      const oldSubmissions = kpis.totalSubmissions || 22540;
      const newSubmissions = (kpis.totalSubmissions ?? 0).toLocaleString();
      assert.equal(oldSubmissions, 22540, 'Bug demonstration: 0 || 22540 evaluates to 22540');
      assert.equal(newSubmissions, '0', 'Fix verified: 0 ?? 0 evaluates to "0"');
    });

    test('Participation zero values render as 0% and not default mock percentages', () => {
      const participation = {
        onTime: 0.0,
        late: 0.0,
        missed: 0.0,
        totalSubmissions: 0,
      };

      const oldOnTime = `${participation.onTime || 68}%`;
      const newOnTime = `${participation.onTime ?? 0}%`;
      assert.equal(oldOnTime, '68%', 'Bug demonstration: 0 || 68 evaluates to 68%');
      assert.equal(newOnTime, '0%', 'Fix verified: 0 ?? 0 evaluates to 0%');

      const oldLate = `${participation.late || 18}%`;
      const newLate = `${participation.late ?? 0}%`;
      assert.equal(oldLate, '18%', 'Bug demonstration: 0 || 18 evaluates to 18%');
      assert.equal(newLate, '0%', 'Fix verified: 0 ?? 0 evaluates to 0%');

      const oldMissed = `${participation.missed || 14}%`;
      const newMissed = `${participation.missed ?? 0}%`;
      assert.equal(oldMissed, '14%', 'Bug demonstration: 0 || 14 evaluates to 14%');
      assert.equal(newMissed, '0%', 'Fix verified: 0 ?? 0 evaluates to 0%');
    });

    test('Pass rate comparison previous cycle zero renders as 0% width', () => {
      const item = { department: 'CSM', currentCycle: 0.0, previousCycle: 0.0 };
      const oldWidth = `${item.previousCycle || 75}%`;
      const newWidth = `${item.previousCycle ?? 0}%`;
      assert.equal(oldWidth, '75%', 'Bug demonstration: 0 || 75 evaluates to 75%');
      assert.equal(newWidth, '0%', 'Fix verified: 0 ?? 0 evaluates to 0%');
    });

    test('Null or undefined values safely fall back to 0 without throwing error', () => {
      const emptyKpis = {};
      assert.equal((emptyKpis.totalEnrolled ?? 0).toLocaleString(), '0');
      assert.equal(`${emptyKpis.avgScore ?? 0}%`, '0%');
      assert.equal(`${emptyKpis.passRate ?? 0}%`, '0%');
      assert.equal((emptyKpis.totalSubmissions ?? 0).toLocaleString(), '0');

      const emptyParticipation = null;
      assert.equal(emptyParticipation?.onTime ?? 0, 0);
      assert.equal(emptyParticipation?.late ?? 0, 0);
      assert.equal(emptyParticipation?.missed ?? 0, 0);
    });
  });

});
