import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { OtpInput } from './otp-input';

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <p id="label">Verification code</p>
      <OtpInput value={value} onChange={setValue} labelledBy="label" />
      <output data-testid="value">{value}</output>
    </>
  );
}

const cell = (index: number) => screen.getByLabelText(`Digit ${index} of 6`);
const value = () => screen.getByTestId('value').textContent;

describe('OtpInput', () => {
  it('groups six labelled digit cells under the label', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Verification code' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('fills every cell from a pasted code and ignores non-digits', () => {
    render(<Harness />);
    fireEvent.paste(cell(1), { clipboardData: { getData: () => ' 12-34 56 ' } });
    expect(value()).toBe('123456');
    expect(cell(6)).toHaveValue('6');
  });

  it('accepts OS autofill of the whole code into the first cell', () => {
    render(<Harness />);
    fireEvent.change(cell(1), { target: { value: '654321' } });
    expect(value()).toBe('654321');
  });

  it('moves back and clears the previous digit on Backspace in an empty cell', () => {
    render(<Harness initial="38" />);
    fireEvent.keyDown(cell(3), { key: 'Backspace' });
    expect(value()).toBe('3');
    expect(cell(2)).toHaveFocus();
  });

  it('keeps only the cell after the last digit in the tab order', () => {
    render(<Harness initial="38" />);
    expect(cell(3)).toHaveAttribute('tabindex', '0');
    expect(cell(1)).toHaveAttribute('tabindex', '-1');
  });
});
