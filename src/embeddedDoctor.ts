import { workspace } from "coc.nvim";
import { Commands } from "./commands";
import { DoctorResult, DoctorTargetInfo } from "./doctor";

const padText = (text: string, index: number): string => {
  let neededPadding: number;
  if (index === 0) {
    neededPadding = 22 - text.length;
  } else if (text.length <= 2) {
    neededPadding = 15 + text.length;
  } else {
    neededPadding = 18 - text.length;
  }

  const neededPre = Math.round(neededPadding / 2);

  const preSpacing = neededPre > 0 ? " ".repeat(neededPre) : " ";
  const postSpacing =
    neededPre > 0 ? " ".repeat(neededPadding - neededPre) : " ";
  return `${preSpacing}${text.toString().replace("\n", " ")}${postSpacing}`;
};

export function makeVimDoctor(doctorResult: DoctorResult): void {
  if (!doctorResult) {
    workspace.showMessage("Unable to run Doctor", "error");
    return;
  }
  if (doctorResult.targets) {
    const doctor: string[] = [
      doctorResult.title,
      "-------------",
      ...doctorResult.headerText.split("\n"),
      "",
      Object.keys(doctorResult.targets[0])
        .map((heading: string, index: number) => padText(heading, index))
        .join(" | "),
      "-".repeat(150),
      ...doctorResult.targets.map((target: DoctorTargetInfo) =>
        Object.values(target)
          .map((value, index) => padText(value.trim(), index))
          .join(" | ")
      ),
      "",
    ];

    workspace.nvim.call(
      Commands.OPEN_PREVIEW,
      [doctor, "txt", "setl nonumber", "setl nowrap"],
      true
    );
  } else {
    const doctor: String[] = [
      doctorResult.title,
      "-------------",
      doctorResult.headerText,
      "",
      doctorResult.messages[0].title,
      "",
      ...doctorResult.messages[0].recommendations.map(
        (recommendation) => ` - ${recommendation}`
      ),
      "",
    ];
    workspace.nvim.call(
      Commands.OPEN_PREVIEW,
      [doctor, "txt", "setl nonumber", "setl nowrap"],
      true
    );
  }
}
