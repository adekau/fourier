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
        for (let i = -m; i <= m; i++) {
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

    public async fft(cps: M.Complex[]): Promise<void>/*Promise<DFTData[]>*/ {
        const s = [...cps];
        const c = this.bitLength(cps.length - 1);
        const N = 1 << c;
        // Increase cps length to the next power of two.
        while (s.length < N)
            s.push(M.complex(0, 0));

        const m = N / 2;

        for (let blockLen = 2; blockLen <= N; blockLen *= 2) {
            const phi = M.tau / blockLen;
            // OmegaN using nth root of unity where n <= N.
            const omegaN = M.complex(`${M.cos(phi)} - i${M.sin(phi)}`);

            for (let startPos = 0; startPos < N; startPos += blockLen) {
                console.log(startPos, omegaN);
            }
        }
    }

    private bitLength(n: number): number {
        let c: number = 0;
        while ((1 << c) <= n) c++;
        return c;
    }
}
