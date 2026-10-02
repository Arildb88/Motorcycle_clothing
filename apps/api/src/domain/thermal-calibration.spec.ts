import { MOTORCYCLE_EXPOSURE } from '../recommend/motorcycle/constants';
import {
  THERMAL_FEEDBACK_STEP_C,
  THERMAL_MEAN_CAP_C,
  THERMAL_SHRINKAGE_K,
  appliedThermalBiasC,
  maxOneEventAppliedC,
  nextThermalOffset,
  thermalResidualC,
} from './thermal-calibration';

describe('thermal feedback calibration', () => {
  it('uses the motorcycle shrinkage constant', () => {
    expect(THERMAL_SHRINKAGE_K).toBe(MOTORCYCLE_EXPOSURE.personalShrinkageK);
  });

  it('maps cold, comfortable, and hot to opposite bounded residuals', () => {
    expect(thermalResidualC('too_cold')).toBe(THERMAL_FEEDBACK_STEP_C);
    expect(thermalResidualC('ok')).toBe(0);
    expect(thermalResidualC('too_warm')).toBe(-THERMAL_FEEDBACK_STEP_C);
    expect(thermalResidualC('slightly_cold')).toBe(THERMAL_FEEDBACK_STEP_C / 2);
    expect(thermalResidualC('slightly_warm')).toBe(
      -THERMAL_FEEDBACK_STEP_C / 2,
    );
    expect(thermalResidualC('unknown')).toBe(0);
  });

  it('keeps one event from an empty offset inside the shrunk step', () => {
    const cold = nextThermalOffset(null, 'too_cold');
    const hot = nextThermalOffset(null, 'too_warm');
    const comfortable = nextThermalOffset(null, 'ok');

    expect(cold).toEqual({ n: 1, meanResidual: THERMAL_FEEDBACK_STEP_C });
    expect(hot).toEqual({ n: 1, meanResidual: -THERMAL_FEEDBACK_STEP_C });
    expect(comfortable).toEqual({ n: 1, meanResidual: 0 });

    expect(appliedThermalBiasC(cold)).toBeCloseTo(maxOneEventAppliedC(), 10);
    expect(appliedThermalBiasC(hot)).toBeCloseTo(-maxOneEventAppliedC(), 10);
    expect(appliedThermalBiasC(comfortable)).toBe(0);
    expect(Math.abs(appliedThermalBiasC(cold))).toBeLessThan(0.2);
    expect(Math.abs(appliedThermalBiasC(cold))).toBeLessThan(
      THERMAL_FEEDBACK_STEP_C,
    );
  });

  it('does not change a recommendation baseline when no feedback exists', () => {
    expect(appliedThermalBiasC(null)).toBe(0);
    expect(appliedThermalBiasC({ n: 0, meanResidual: 2 })).toBe(0);
    expect(appliedThermalBiasC(undefined)).toBe(0);
  });

  it('lets comfortable feedback pull an existing cold bias back toward zero', () => {
    const cold = { n: 6, meanResidual: 1 };
    const before = appliedThermalBiasC(cold);
    const after = nextThermalOffset(cold, 'ok');
    expect(before).toBeCloseTo(0.5, 10);
    expect(after.n).toBe(7);
    expect(after.meanResidual).toBeCloseTo(6 / 7, 10);
    expect(appliedThermalBiasC(after)).toBeLessThan(before);
    expect(appliedThermalBiasC(after)).toBeGreaterThan(0);
  });

  it('caps a long run of the same rating and grows the applied bias slowly', () => {
    let offset = nextThermalOffset(null, 'too_cold');
    const first = appliedThermalBiasC(offset);
    for (let i = 0; i < 40; i += 1) {
      offset = nextThermalOffset(offset, 'too_cold');
    }
    expect(offset.meanResidual).toBeLessThanOrEqual(THERMAL_MEAN_CAP_C);
    expect(offset.meanResidual).toBeGreaterThan(0);
    expect(appliedThermalBiasC(offset)).toBeLessThanOrEqual(THERMAL_MEAN_CAP_C);
    expect(appliedThermalBiasC(offset)).toBeGreaterThan(first);
    expect(appliedThermalBiasC(offset)).toBeLessThanOrEqual(
      THERMAL_FEEDBACK_STEP_C,
    );

    let hot = { n: 0, meanResidual: 0 };
    for (let i = 0; i < 40; i += 1) {
      hot = nextThermalOffset(hot, 'too_warm');
    }
    expect(hot.meanResidual).toBeGreaterThanOrEqual(-THERMAL_MEAN_CAP_C);
    expect(appliedThermalBiasC(hot)).toBeGreaterThanOrEqual(
      -THERMAL_FEEDBACK_STEP_C,
    );
    expect(appliedThermalBiasC(hot)).toBeLessThan(0);
  });

  it('does not let a stored mean outside the cap reach the recommendation', () => {
    expect(
      appliedThermalBiasC({ n: 100, meanResidual: 99 }),
    ).toBeLessThanOrEqual(THERMAL_MEAN_CAP_C);
    expect(
      appliedThermalBiasC({ n: 100, meanResidual: -99 }),
    ).toBeGreaterThanOrEqual(-THERMAL_MEAN_CAP_C);
  });
});
