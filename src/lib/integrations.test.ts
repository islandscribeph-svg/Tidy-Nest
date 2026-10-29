import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isGoogleDriveUrl } from "@/lib/drive-url";
import { dealsToIcal } from "@/lib/ical";
import { sheetsBackupStatus, slackStatus } from "@/lib/integrations";
import { slackStageMessage } from "@/lib/slack-message";

const alias = [{ match: "Harborlane", display: "Market Street" }];

describe("integrations stay off and aliased", () => {
  it("rejects non-Drive links and keeps the surname out of messages and the feed", () => {
    assert.equal(isGoogleDriveUrl("https://drive.google.com/drive/folders/abc"), true);
    assert.equal(isGoogleDriveUrl("https://docs.google.com/document/d/abc"), true);
    assert.equal(isGoogleDriveUrl("https://example.com/file"), false);
    const message = slackStageMessage(
      { stage: "IN_PROGRESS", title: "Spring", contact: { firstName: "Alex", lastName: "Harborlane" } },
      "stage",
      alias,
    );
    const ical = dealsToIcal([
      {
        id: "s-15",
        stage: "IN_PROGRESS",
        title: "Spring",
        consultDate: null,
        projectStartDate: "2026-03-02T12:00:00.000Z",
        dateClosed: null,
        contact: { firstName: "Alex", lastName: "Harborlane" },
      },
    ], alias);
    const packed = `${message}\n${ical}`;
    assert.equal(packed.toLowerCase().includes("harborlane"), false);
    assert.match(message, /Market Street/);
    assert.doesNotMatch(message, /@/);
    delete process.env.GOOGLE_SHEETS_BACKUP_ENABLED;
    delete process.env.SLACK_NOTIFICATIONS_ENABLED;
    assert.equal(sheetsBackupStatus().enabled, false);
    assert.equal(slackStatus().enabled, false);
  });
});
