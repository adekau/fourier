export class ComplexNumber {
    public re: number;
    public im: number;
    constructor({ re = 0, im = 0 } = {}) {
      this.re = re;
      this.im = im;
    }

    add(addend) {
      // Make sure we're dealing with complex number.
      const complexAddend = this.toComplexNumber(addend);

      return new ComplexNumber({
        re: this.re + complexAddend.re,
        im: this.im + complexAddend.im,
      });
    }

    subtract(subtrahend) {
      // Make sure we're dealing with complex number.
      const complexSubtrahend = this.toComplexNumber(subtrahend);

      return new ComplexNumber({
        re: this.re - complexSubtrahend.re,
        im: this.im - complexSubtrahend.im,
      });
    }

    multiply(multiplicand) {
      // Make sure we're dealing with complex number.
      const complexMultiplicand = this.toComplexNumber(multiplicand);

      return new ComplexNumber({
        re: this.re * complexMultiplicand.re - this.im * complexMultiplicand.im,
        im: this.re * complexMultiplicand.im + this.im * complexMultiplicand.re,
      });
    }

    divide(divider) {
      // Make sure we're dealing with complex number.
      const complexDivider = this.toComplexNumber(divider);

      // Get divider conjugate.
      const dividerConjugate = this.conjugate(complexDivider);

      // Multiply dividend by divider's conjugate.
      const finalDivident = this.multiply(dividerConjugate);

      // Calculating final divider using formula (a + bi)(a − bi) = a^2 + b^2
      const finalDivider = (complexDivider.re ** 2) + (complexDivider.im ** 2);

      return new ComplexNumber({
        re: finalDivident.re / finalDivider,
        im: finalDivident.im / finalDivider,
      });
    }

    conjugate(n) {
      // Make sure we're dealing with complex number.
      const complexNumber = this.toComplexNumber(n);

      return new ComplexNumber({
        re: complexNumber.re,
        im: -1 * complexNumber.im,
      });
    }

    getRadius() {
      return Math.sqrt((this.re ** 2) + (this.im ** 2));
    }


    toComplexNumber(n) {
      if (n instanceof ComplexNumber) {
        return n;
      }

      return new ComplexNumber({ re: n });
    }
  }
