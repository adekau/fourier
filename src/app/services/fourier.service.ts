import { Injectable } from '@angular/core';
import * as M from 'mathjs';

import { DFTData } from '../interfaces/dft-data';
import { ComplexNumber } from './complex-number';

@Injectable({
    providedIn: 'root'
})
export class FourierService {
    constructor() { }

    public async dft(cps: M.Complex[], m: number): Promise<DFTData[]> {
        const X = [];
        const N = cps.length;
        for (let i = 0; i < N; i++) {
            let sum = M.complex('0');
            for (let n = 0; n < N; n++) {
                const xn = cps[n];
                const theta = -(2 * M.pi * i * n) / N;
                const c = M.complex(`${M.cos(theta)}+${M.sin(theta)}i`);
                sum = M.add(sum, M.multiply(xn, c)) as M.Complex;
            }
            const { re, im } = M.multiply(1 / N, sum) as M.Complex;
            X.push({
                re,
                im,
                freq: i,
                radius: M.sqrt((re * re) + (im * im)),
                phase: M.atan2(im, re)
            });
        }
        return X;
    }

    public async fft(cps: M.Complex[]): Promise<DFTData[]> {
        const s = [...cps];
        const c = this.bitLength(cps.length - 1);
        const N = 1 << c;
        const radix = 2;

        // Increase cps length to the next power of two.
        while (s.length < N)
            s.push(M.complex(0, 0));

        // Split by evens/odds by using the bit-reverse technique.
        const output: DFTData[] = [];
        for (let d = 0; d < N; d++)
            output[d] = s[this.reverseBits(d, c)] as DFTData;

        for (let blockLen = radix; blockLen <= N; blockLen *= radix) {
            const phi = M.tau / blockLen;
            // OmegaN using nth root of unity where n <= N.
            const omegaN = M.complex(M.cos(phi), M.sin(phi));

            for (let startPos = 0; startPos < N; startPos += blockLen) {
                let omegaNPowStartPos: M.Complex = M.complex(1, 0);
                for (let indexInBlock = startPos; indexInBlock < (startPos + blockLen / 2); indexInBlock++) {
                    // multiply by omegaN^indexInBlock before and then its just add/subtract
                    const output1 = output[indexInBlock];
                    const output1AsComplex: M.Complex = M.complex(output1.re, output1.im);
                    const output2 = output[indexInBlock + blockLen / 2];

                    const multiplier: M.Complex = M.multiply(
                        M.complex(output2.re, output2.im),
                        omegaNPowStartPos
                    ) as M.Complex;

                    const add: M.Complex = M.add(output1AsComplex, multiplier) as M.Complex;
                    const addData: DFTData = {
                        ...add,
                        freq: indexInBlock,
                        radius: add.re * add.re + add.im * add.im,
                        phase: M.atan2(add.im, add.re)
                    };
                    const sub: M.Complex = M.subtract(output1AsComplex, multiplier) as M.Complex;
                    const subData: DFTData = {
                        ...sub,
                        freq: indexInBlock + blockLen / 2,
                        radius: sub.re * sub.re + sub.im * sub.im,
                        phase: M.atan2(sub.im, sub.re)
                    };
                    output[indexInBlock] = addData;
                    output[indexInBlock + blockLen / 2] = subData;

                    omegaNPowStartPos = M.multiply(omegaNPowStartPos, omegaN) as M.Complex;
                }
            }
        }
        return output;
    }

    private reverseBits(n: number, c: number): number {
        let r = 0;
        for (let i = 0; i < c; i++) {
            r *= 2;
            if (M.floor(n / (1 << i)) % 2 === 1)
                r += 1;
        }
        return r;
    }

    private bitLength(n: number): number {
        let c: number = 0;
        while ((1 << c) <= n) c++;
        return c;
    }

    public fastFourierTransform(inputData, inverse = false) {
        const bitsCount = this.bitLength(inputData.length - 1);
        const N = 1 << bitsCount;

        while (inputData.length < N) {
          inputData.push(new ComplexNumber());
        }

        const output = [];
        for (let dataSampleIndex = 0; dataSampleIndex < N; dataSampleIndex += 1) {
          output[dataSampleIndex] = inputData[this.reverseBits(dataSampleIndex, bitsCount)];
        }

        for (let blockLength = 2; blockLength <= N; blockLength *= 2) {
          const imaginarySign = inverse ? -1 : 1;
          const phaseStep = new ComplexNumber({
            re: Math.cos(2 * Math.PI / blockLength),
            im: imaginarySign * Math.sin(2 * Math.PI / blockLength),
          });

          for (let blockStart = 0; blockStart < N; blockStart += blockLength) {
            let phase = new ComplexNumber({ re: 1, im: 0 });

            for (let signalId = blockStart; signalId < (blockStart + blockLength / 2); signalId += 1) {
              const component = output[signalId + blockLength / 2].multiply(phase);

              const upd1 = output[signalId].add(component);
              const upd2 = output[signalId].subtract(component);

              output[signalId] = upd1;
              output[signalId + blockLength / 2] = upd2;

              phase = phase.multiply(phaseStep);
            }
          }
        }

        if (inverse) {
          for (let signalId = 0; signalId < N; signalId += 1) {
            output[signalId] /= N;
          }
        }

        return output;
      }
}
