import { test } from '@playwright/test';

test(
  'outputs 10 lines to stdout',
  {
    annotation: [
      {
        type: 'stdout-test',
        description:
          'Generates 10 lines of stdout to verify the >3 lines preview modal functionality in zen-reporter',
      },
    ],
  },
  async () => {
    for (let i = 1; i <= 10; i++) {
      console.log(
        `[STDOUT Log Line ${i}/10] Application step completed successfully at index ${i}`
      );
    }
  }
);

test(
  'outputs 10 lines to stderr',
  {
    annotation: [
      {
        type: 'stderr-test',
        description:
          'Generates 10 lines of stderr to verify the >3 lines preview modal functionality in zen-reporter',
      },
    ],
  },
  async () => {
    for (let i = 1; i <= 10; i++) {
      console.error(
        `[STDERR Warning Line ${i}/10] Detailed warning trace or non-fatal exception stack line ${i}`
      );
    }
  }
);
