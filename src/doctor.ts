type NonEmptyArray<A> = { 0: A } & A[];

export type DoctorResult = {
  /** The name of Doctor */
  title: string;
  /** Head text to be displayed always */
  headerText: string;
} & (
  | {
      /** Suggestion Doctor messages that contain suggestions if no targets are found */
      messages: NonEmptyArray<DoctorMessage>;
      targets: never;
    }
  | {
      messages: never;
      /** Status information for each target */
      targets: NonEmptyArray<DoctorTargetInfo>;
    }
);

export interface DoctorMessage {
  /** Title for each message */
  title: string;
  /** List of recommendations for a single potential issue */
  recommendations: string[];
}

export interface DoctorTargetInfo {
  /** Name of the target */
  buildTarget: string;
  /** Scala Version of the target */
  scala: string;
  /** Status of diagnostics for the target */
  diagnostics: string;
  /** Status of goto definition for the target */
  gotoDefinition: string;
  /** Status of completions for the target */
  completions: string;
  /** Status of find references for the target */
  findReferences: string;
  /** Recommendation for how to fix an issue with a target */
  recommendation: string;
}
