export {
  runMotorcycleRecommendationPipeline,
  motorcycleExposureC,
  warmthDemandFromExposureC,
  windDemandFromPoint,
  waterDemandFromPoint,
  buildRideSegments,
  durationWeightedMean,
  durationWeightedSpeedKmh,
  computeDemand,
  matchWardrobe,
  computeConfidence,
  computeApparentAirflow,
  associateWeatherIndex,
  routeTravelFromDurationDistance,
} from './pipeline';
export type { PipelineInput, ApparentAirflow, ApparentAirflowMode } from './pipeline';
export type { RouteTravelSegment, SpeedSource } from './route-travel';
export * from './types';
export * from './constants';
