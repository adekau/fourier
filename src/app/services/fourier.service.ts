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

    // public async fft(cps: M.Complex[], m: number): Promise<DFTData[]> {

    // }
}
