import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import * as M from 'mathjs';
import * as p5 from 'p5';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { DFTData } from './interfaces/dft-data';
import { FourierService } from './services/fourier.service';

let pf: ReturnType<AppComponent['parameterize']> = null;
let coeffs: DFTData[] = [];
let pts: [number, number][] = null;
let points = [];

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit {
    @ViewChild('canvas', { static: false }) private canvas: ElementRef;
    public m = 30;
    public scalingFactor = 2;
    public reloading = false;
    public vertexInterval = 0.02;

    private p5: p5;

    constructor(
        private cdr: ChangeDetectorRef,
        private fourierService: FourierService
    ) { }

    public async loadSvg() {
        this.reloading = true;
        this.reset();

        const response = await fetch('./assets/llama.svg');
        const text = await response.text();

        if (!pts) {
            pts = await this.sampleSvgPoints(text);
            const center = M.mean([M.min(pts), M.max(pts)]);
            pts = pts.map(([x, y]) => [
                (x - center) * this.scalingFactor,
                (y - center) * this.scalingFactor
            ]);
        }

        const complexPts = pts.map(pt => this.ptToComplex(pt));
        coeffs = await this.fourierService.dft([...complexPts], this.m);
        console.log(coeffs);
        console.log(await this.fourierService.fft(complexPts));
        // pf = this.parameterize([...coeffs]);
        this.reloading = false;
        this.cdr.detectChanges();
        this.p5 = new p5(this.sketch.bind(this), this.canvas.nativeElement);
    }

    private reset() {
        pf = null;
        coeffs = [];
        points = [];
        this.cdr.detectChanges();
        if (this.p5)
            this.p5.remove();
        this.p5 = null;
    }

    public resetScale() {
        pts = null;
        this.loadSvg();
    }

    public async ngAfterViewInit() {
        fromEvent(window, 'resize')
            .pipe(debounceTime(250))
            .subscribe({
                next: () => this.loadSvg()
            });

        await this.loadSvg();
    }

    private async sampleSvgPoints(xml: string): Promise<[number, number][]> {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        let samplePts = [];

        doc.querySelectorAll('path').forEach(path => {
            const sample = [];
            const n = M.floor(path.getTotalLength());
            for (let i = 0; i < n; i += 1.5) {
                sample.push(this.toPt(path.getPointAtLength(i)));
            }
            samplePts = samplePts.concat(sample);
        });

        return samplePts;
    }

    private toPt(pt: SVGPoint): [number, number] {
        return [pt.x, pt.y];
    }

    private ptToComplex(pt: number[]): M.Complex {
        return M.complex(`${pt[0]} + ${pt[1]}i`);
    }

    private parameterize(cn: M.Complex[]) {
        return async (t: number): Promise<M.Complex> => this.reloading
            ? M.complex('0')
            : await this.sigma(k => M.multiply(cn[k - 1], M.exp(M.multiply(M.i, (k - this.m - 1) * t))), [1, 2 * this.m + 1]) as M.Complex;
    }

    private async sigma(exp: (k: number) => M.MathType, interval: [number, number]): Promise<M.MathType> {
        let sum: M.MathType = 0;
        for (let i = interval[0]; i <= interval[1]; i++)
            sum = M.add(sum, exp(i));
        return sum;
    }

    private sketch(p: any) {
        let time = 0;
        p.setup = () => {
            p.createCanvas(window.innerWidth - 225, window.innerHeight - 10);
            p.frameRate(30);
        };

        p.draw = async () => {
            p.background(25);

            const v = p.epicycles(p.width / 2, p.height / 2, coeffs.sort((a, b) =>
                b.radius - a.radius));
            points.unshift(v);

            p.stroke(230);
            p.beginShape();
            for (let i = 0; i < points.length; i++)
                p.vertex(points[i].x, points[i].y);
            p.endShape();

            if (time > M.pi * 2)
                points.pop();

            time += M.min((2 * M.pi) / pts.length, +this.vertexInterval);
        };

        p.epicycles = (x: number, y: number, complex: DFTData[]) => {
            for (let i = 0; i < complex.length; i++) {
                const cn = complex[i];
                const prevx = x;
                const prevy = y;
                const { freq, radius, phase } = cn;
                x += radius * M.cos(freq * time + phase);
                y += radius * M.sin(freq * time + phase);

                p.stroke(230, 85);
                p.noFill();
                p.ellipse(prevx, prevy, radius * 2);
                p.stroke(230, 142);
                p.line(prevx, prevy, x, y);
            }
            return p.createVector(x, y);
        };
    }
}
