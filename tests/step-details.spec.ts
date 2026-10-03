import { fileURLToPath } from 'url';
import { expect, test } from '@playwright/test';
import { processRawData } from '../src/lib/dataProcessor';
import { convertPlaywrightSteps } from '../src/lib/codeHighlighting';

const currentFile = fileURLToPath(import.meta.url);

test.describe('Step Subtitle and Location Support', () => {
  test('convertPlaywrightSteps retains subtitle property', () => {
    const mockPwSteps = [
      {
        title: 'Step with subtitle',
        subtitle: 'Custom subtitle text',
        duration: 120,
        steps: [
          {
            title: 'Sub-step with subtitle',
            subtitle: 'Child subtitle text',
            duration: 45,
          },
        ],
      },
    ];

    const converted = convertPlaywrightSteps(
      mockPwSteps as unknown as Parameters<typeof convertPlaywrightSteps>[0]
    );
    expect(converted[0].title).toBe('Step with subtitle');
    expect(converted[0].subtitle).toBe('Custom subtitle text');
    expect(converted[0].subSteps?.[0].title).toBe('Sub-step with subtitle');
    expect(converted[0].subSteps?.[0].subtitle).toBe('Child subtitle text');
  });

  test('processRawData retains subtitle property', () => {
    const rawData = {
      tests: [
        {
          title: 'Test case with step subtitle',
          status: 'passed',
          duration: 200,
          steps: [
            {
              title: 'Action step',
              subtitle: 'Detailed description of action',
              duration: 100,
            },
          ],
        },
      ],
    };

    const report = processRawData(rawData as unknown as Parameters<typeof processRawData>[0]);
    const tc = report.testRun.suites[0].cases[0];
    expect(tc.steps?.[0].subtitle).toBe('Detailed description of action');
  });

  test('convertPlaywrightSteps extracts location property', () => {
    const mockPwSteps = [
      {
        title: 'Step with location',
        duration: 120,
        location: {
          file: currentFile,
          line: 10,
          column: 5,
        },
      },
    ];

    const converted = convertPlaywrightSteps(
      mockPwSteps as unknown as Parameters<typeof convertPlaywrightSteps>[0]
    );
    expect(converted[0].location).toEqual({
      file: currentFile,
      line: 10,
      column: 5,
    });
  });

  test('convertPlaywrightSteps extracts params property', () => {
    const mockPwSteps = [
      {
        title: 'Step with params',
        duration: 120,
        params: { selector: '#login-btn', timeout: 5000 },
      },
    ];

    const converted = convertPlaywrightSteps(
      mockPwSteps as unknown as Parameters<typeof convertPlaywrightSteps>[0]
    );
    expect(converted[0].params).toEqual({ selector: '#login-btn', timeout: 5000 });
  });

  test('processRawData retains params property', () => {
    const rawData = {
      tests: [
        {
          title: 'Test case with step params',
          status: 'passed',
          duration: 200,
          steps: [
            {
              title: 'Fill input',
              params: { value: 'username' },
              duration: 100,
            },
          ],
        },
      ],
    };

    const report = processRawData(rawData as unknown as Parameters<typeof processRawData>[0]);
    const tc = report.testRun.suites[0].cases[0];
    expect(tc.steps?.[0].params).toEqual({ value: 'username' });
  });
});
