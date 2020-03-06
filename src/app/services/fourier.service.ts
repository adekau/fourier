import { Injectable } from '@angular/core';
import * as M from 'mathjs';

import { DFTData } from '../interfaces/dft-data';

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
        const pts = [...cps];
        const ptsCount = this.bitLength(cps.length - 1);
        const N = 1 << ptsCount;
        const radix = 2;

        // Increase cps length to the next power of two.
        while (pts.length < N)
            pts.push(pts[pts.length - 1]);

        // Split by evens/odds by using the bit-reverse technique.
        const output: M.Complex[] = [];
        for (let i = 0; i < N; i++)
            output[i] = pts[this.reverseBits(i, ptsCount)];

        for (let blockLen = radix; blockLen <= N; blockLen *= radix) {
            const phi = -M.tau / blockLen;
            // OmegaN using nth root of unity where n <= N.
            const omegaN = M.complex(M.cos(phi), M.sin(phi));
            for (let startPos = 0; startPos < N; startPos += blockLen) {
                let omegaNPowStartPos: M.Complex = M.complex(1, 0);
                for (let indexInBlock = startPos; indexInBlock < (startPos + blockLen / 2); indexInBlock++) {
                    // multiply by omegaN^indexInBlock before and then its just add/subtract
                    const output1 = output[indexInBlock];
                    const output2 = output[indexInBlock + blockLen / 2];

                    const multiplier: M.Complex = M.multiply(
                        output2,
                        omegaNPowStartPos
                    ) as M.Complex;

                    const add: M.Complex = M.add(output1, multiplier) as M.Complex;
                    const sub: M.Complex = M.subtract(output1, multiplier) as M.Complex;

                    output[indexInBlock] = add;
                    output[indexInBlock + blockLen / 2] = sub;
                    omegaNPowStartPos = M.multiply(omegaNPowStartPos, omegaN) as M.Complex;
                }
            }
        }
        return output.map((complex, i): DFTData => {
            const re = complex.re / N;
            const im = complex.im / N;

            return {
                ...complex,
                re,
                im,
                freq: i,
                radius: M.sqrt(re ** 2 + im ** 2),
                phase: M.atan2(im, re)
            };
        });
    }

    private reverseBits(n: number, totalCount: number): number {
        let r = 0;
        for (let i = 0; i < totalCount; i++) {
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
}
