import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as M from 'mathjs';
import * as p5 from 'p5';

import { DFTData } from '../interfaces/dft-data';
import { FourierService } from '../services/fourier.service';

@Component({
    selector: 'fourier-animate',
    template: `
        <div *ngIf="!reloading" #canvas></div>
        <div class="reloading" *ngIf="reloading">Loading</div>
    `,
    styleUrls: ['fourier-animate.component.scss']
})
export class FourierAnimateComponent implements OnInit, OnChanges {
    @ViewChild('canvas', { static: false }) private canvas: ElementRef;
    @Input() public pts: [number, number][] = [];
    @Input() public reloading: boolean;
    @Input() public timing: number = 0.04;
    private coeffs: DFTData[] = [];
    private points = [];
    private p5: p5;

    constructor(private fourierService: FourierService) { }

    public ngOnInit(): void {
        if (this.canvas)
            this.p5 = new p5(this.sketch.bind(this), this.canvas.nativeElement);
    }

    public async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes.pts) {
            this.reset();

            const complexPts = this.pts.map(pt => this.ptToComplex(pt));
            this.coeffs = await this.fourierService.dft(complexPts);
            if (this.p5) {
                this.p5.remove();
                this.p5 = null;
            }
            this.ngOnInit();
        }
    }

    public reset(): void {
        this.points = [];
    }

    private ptToComplex(pt: number[]): M.Complex {
        return M.complex(`${pt[0]} + ${pt[1]}i`);
    }

    private sketch(p: any) {
        let time = 0;
        p.setup = () => {
            p.createCanvas(window.innerWidth - 225, window.innerHeight - 10);
            p.frameRate(30);
        };

        p.draw = async () => {
            p.background(25);
            const v = p.epicycles(p.width / 2, p.height / 2, this.coeffs.sort((a, b) =>
                b.radius - a.radius));
            this.points.unshift(v);

            p.stroke(230);
            p.beginShape();
            for (let i = 0; i < this.points.length; i++)
                p.vertex(this.points[i].x, this.points[i].y);
            p.endShape();

            if (time > Math.PI * 2)
                this.points.pop();

            time += this.timing;
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
