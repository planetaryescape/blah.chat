import { expect, test } from "bun:test";
import { runTrackedAction } from "../lib/utils/asyncAction";
import { shouldSendOnEnter } from "../lib/utils/chatPreferences";
import { getNoteExitPatch, leaveNote } from "../lib/utils/noteExit";

test("Enter remains newline while preferences load and respects the saved value", () => {
  expect(shouldSendOnEnter(undefined)).toBe(false);
  expect(shouldSendOnEnter({ sendOnEnter: false })).toBe(false);
  expect(shouldSendOnEnter({ sendOnEnter: true })).toBe(true);
  expect(shouldSendOnEnter({})).toBe(true);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("pending stays true until every overlapping action settles", async () => {
  const first = deferred();
  const second = deferred();
  const count = { current: 0 };
  let pending = false;
  const setPending = (value) => {
    pending = value;
  };
  const a = runTrackedAction(count, setPending, () => first.promise);
  const b = runTrackedAction(count, setPending, () => second.promise);
  expect(pending).toBe(true);
  first.resolve("first");
  expect(await a).toBe("first");
  expect(pending).toBe(true);
  second.resolve("second");
  expect(await b).toBe("second");
  expect(pending).toBe(false);
  expect(count.current).toBe(0);
});

test("a rejected action cannot clear another pending run and can be retried", async () => {
  const slow = deferred();
  const count = { current: 0 };
  let pending = false;
  let errors = 0;
  const setPending = (value) => {
    pending = value;
  };
  const a = runTrackedAction(count, setPending, () => slow.promise);
  expect(
    await runTrackedAction(
      count,
      setPending,
      async () => {
        throw new Error("offline");
      },
      () => {
        errors++;
      },
    ),
  ).toBeUndefined();
  expect(errors).toBe(1);
  expect(pending).toBe(true);
  slow.resolve(true);
  await a;
  expect(pending).toBe(false);
  expect(await runTrackedAction(count, setPending, async () => "retry")).toBe(
    "retry",
  );
});

const current = {
  noteId: "n1",
  title: "New first line",
  content: "New first line",
};
test("auto-derived title is never overwritten by an untouched local title", () => {
  expect(
    getNoteExitPatch(current, {
      content: "New first line\nmore",
      title: "Old first line",
      titleEdited: false,
    }),
  ).toEqual({ noteId: "n1", content: "New first line\nmore" });
  expect(
    getNoteExitPatch(current, {
      content: current.content,
      title: "Old first line",
      titleEdited: false,
    }),
  ).toBeNull();
});
test("explicit title edits are saved, including an intentionally empty title", () => {
  expect(
    getNoteExitPatch(current, {
      content: current.content,
      title: "My title",
      titleEdited: true,
    }),
  ).toEqual({ noteId: "n1", title: "My title" });
  expect(
    getNoteExitPatch(current, {
      content: current.content,
      title: "",
      titleEdited: true,
    }),
  ).toEqual({ noteId: "n1", title: "Untitled Note" });
});
test("rapid Back taps save and navigate only once, even after the save resolves", async () => {
  const saving = deferred();
  const guard = { current: false };
  let saves = 0;
  let backs = 0;
  const save = () => {
    saves++;
    return saving.promise;
  };
  const navigate = () => {
    backs++;
  };
  const a = leaveNote(
    guard,
    { noteId: "n1", content: "draft" },
    save,
    navigate,
  );
  await leaveNote(guard, { noteId: "n1", content: "draft" }, save, navigate);
  expect(saves).toBe(1);
  expect(backs).toBe(0);
  saving.resolve(true);
  await a;
  await leaveNote(guard, null, save, navigate);
  expect(backs).toBe(1);
});
test("failed Back save keeps the screen and unlocks a retry", async () => {
  const guard = { current: false };
  let backs = 0;
  await leaveNote(
    guard,
    { noteId: "n1", content: "draft" },
    async () => undefined,
    () => {
      backs++;
    },
  );
  expect(guard.current).toBe(false);
  expect(backs).toBe(0);
  await leaveNote(
    guard,
    { noteId: "n1", content: "draft" },
    async () => true,
    () => {
      backs++;
    },
  );
  expect(backs).toBe(1);
});
