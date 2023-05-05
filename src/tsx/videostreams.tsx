import React from "react";
import { Card, CardContent } from '@mui/material';
import Grid from '@mui/material/Grid'
import { ROSCompressedImage } from "../util/util";
import * as Bp from "./buttonpads"
import { PredictiveDisplay } from "./predictivedisplay";
import "../css/videostreams.css"

type VideoStreamProps = {
    width: number,
    height: number,
    fps: number
}

export class VideoStream extends React.Component<VideoStreamProps> {
    canvas = React.createRef<HTMLCanvasElement>();
    img: HTMLImageElement;
    video: HTMLVideoElement;
    width: number;
    height: number;
    fps: number;
    outputVideoStream?: MediaStream

    constructor(props: VideoStreamProps) {
        super(props);
        this.width = props.width;
        this.height = props.height;
        this.fps = props.fps;
        this.img = document.createElement("img");
        this.video = document.createElement("video");
        this.video.style.display = "block";
        this.video.setAttribute("width", this.width.toString());
        this.video.setAttribute("height", this.height.toString());
    }

    get imageReceived() {
        return this.img.src != null;
    }

    renderVideo() {
        if (!this.imageReceived) {
            return;
        }
        this.canvas.current?.getContext('2d')?.drawImage(this.img, 0, 0, this.width, this.height)
    }

    updateImage(message: ROSCompressedImage) {
        this.img.src = 'data:image/jpg;base64,' + message.data;
    }

    drawVideo() {
        this.renderVideo();
        requestAnimationFrame(this.drawVideo.bind(this));
    }

    start() {
        this.outputVideoStream = this.canvas.current?.captureStream(this.fps);
        this.video.srcObject = this.outputVideoStream as MediaProvider;
        this.drawVideo();
    }

    render() {
        return (
            <canvas ref={this.canvas!} width={this.width} height={this.height} style={{width: "100%"}}></canvas>
        )
    }
}

// Gripper video stream
export const VideoStreamComponent = (props: {streams: VideoStream[]}) => {
    console.log(props.streams)
    let buttonPads = Bp.ExampleButtonPads;
    // let buttonPads = [undefined, undefined, undefined];
    // Replace the overhead button pad with predictive display
    // buttonPads[0] = <PredictiveDisplay onClick={(len, ang) => console.log(`Length: ${len}, Angle: ${ang}`)}/>;
    const widths = ["34%", "20%", "40%"];
    return (
        <div id="video-stream-container">
            {props.streams.map((stream, i) => (
                <div key={i} className="video-stream" style={{width: widths[i]}}>
                    {/* <div className="video-button-pad">
                        {buttonPads[i]}
                    </div> */}
                    {stream.render()}
                </div>
            )
            )}
        </div>
    );
};