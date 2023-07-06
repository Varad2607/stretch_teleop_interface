// Adapted from ros2djs and nav2djs 

import React from "react";
import createjs from "createjs-module";
import { ROSOccupancyGrid, ROSPoint, ROSPose } from "shared/util";
import ROSLIB from "roslib";
import { MapFunctions } from "../layout_components/Map";

export class OccupancyGrid extends React.Component {
    private rootObject: createjs.Stage
    private origin?: ROSLIB.Pose
    private bitmap?: createjs.Bitmap
    public width: number
    public height: number
    private scaleX?: number
    private scaleY?: number
    private map: ROSOccupancyGrid
    private goalMarker?: createjs.Shape
    private getGoalReached?: NodeJS.Timer
    private savedPoseMarkers: { circle: createjs.Shape, label: createjs.Text }[]
    private savedPoseMarkersLabels: string[]
    private functs: MapFunctions
    constructor(props: {
        functs: MapFunctions
        rootObject: createjs.Stage
    }) {
        super(props);
        this.rootObject = props.rootObject
        this.rootObject.enableMouseOver();
        this.width = 0
        this.height = 0
        this.map = props.functs.GetMap
        this.functs = props.functs
        this.savedPoseMarkers = []
        this.savedPoseMarkersLabels = []
        this.createOccupancyGridClient()
    }

    drawSavedPoseMarker(x: number, y: number, color: number[], text: string) {
        var circle = new createjs.Shape()
        var radius = 30

        var graphics = new createjs.Graphics();
        graphics.beginFill(createjs.Graphics.getRGB(color[0], color[1], color[2], 0.5))
        graphics.drawCircle(0, 0, radius)

        createjs.Shape.call(circle, graphics);

        circle.x = x
        circle.y = y
        circle.scaleX = 1.0 / this.rootObject.scaleX
        circle.scaleY = 1.0 / this.rootObject.scaleY

        var label = new createjs.Text(text, "bold 40px Arial", "#ff7700");
        label.x = x
        label.y = y - 10
        label.textAlign = "center"
        label.scaleX = 1.0 / this.rootObject.scaleX
        label.scaleY = 1.0 / this.rootObject.scaleY
        label.textBaseline = "alphabetic";

        circle.on("mouseover", (event) => {
            label.visible = true
        })
        circle.on("mouseout", (event) => {
            label.visible = false
        })
        return { circle, label }
    }

    drawNavigationArrow(pulse: boolean, color: number[]) {
        var arrow = new createjs.Shape()
        var size = 40;
        var strokeSize = 0;
        var strokeColor = createjs.Graphics.getRGB(color[0], color[1], color[2], 0.7);
        var fillColor = createjs.Graphics.getRGB(color[0], color[1], color[2], 0.7);

        // draw the arrow
        var graphics = new createjs.Graphics();

        // line width
        graphics.setStrokeStyle(strokeSize);
        graphics.moveTo(0.0, size / 2.0);
        graphics.beginStroke(strokeColor);
        graphics.beginFill(fillColor);
        graphics.lineTo(-size / 2.0, -size / 2.0);
        graphics.lineTo(size / 2.0, -size / 2.0);
        graphics.lineTo(0.0, size / 2.0);
        graphics.closePath();
        graphics.endFill();
        graphics.endStroke();

        // create the shape
        createjs.Shape.call(arrow, graphics);

        // check if we are pulsing
        if (pulse) {
            // have the model "pulse"
            var growCount = 0;
            var growing = true;
            createjs.Ticker.addEventListener('tick', () => {
                if (growing) {
                    arrow.scaleX *= 1.035;
                    arrow.scaleY *= 1.035;
                    growing = (++growCount < 10);
                }
                else {
                    arrow.scaleX /= 1.035;
                    arrow.scaleY /= 1.035;
                    growing = (--growCount < 0);
                }
            });
        }
        return arrow
    };

    createOccupancyGrid() {
        // internal drawing canvas
        var canvas = document.createElement('canvas')
        var context = canvas!.getContext('2d');

        // save the metadata we need
        this.origin = new ROSLIB.Pose({
            position: this.map.info.origin.position,
            orientation: this.map.info.origin.orientation
        });
        // set the size
        this.width = this.map.info.width;
        this.height = this.map.info.height;
        canvas.width = this.width
        canvas.height = this.height

        var imageData = context!.createImageData(this.width, this.height);
        for (var row = 0; row < this.height; row++) {
            for (var col = 0; col < this.width; col++) {
                // determine the index into the map data
                var mapI = col + ((this.height - row - 1) * this.width);
                // determine the value
                var data = this.map.data[mapI];
                var val;
                if (data === 100) {
                    val = 0;
                }
                else if (data === 0) {
                    val = 255;
                }
                else {
                    val = 127;
                }
                // determine the index into the image data array
                var i = (col + (row * this.width)) * 4;
                // r
                imageData.data[i] = val;
                // g
                imageData.data[++i] = val;
                // b
                imageData.data[++i] = val;
                // a
                imageData.data[++i] = 255;
            }
        }
        context!.putImageData(imageData, 0, 0);

        // create the bitmap
        this.bitmap = new createjs.Bitmap(canvas);
        this.rootObject.addChild(this.bitmap)

        // scale the image
        this.scaleX = this.map.info.resolution;
        this.scaleY = this.map.info.resolution;
    }

    rosToGlobal(translation: ROSLIB.Vector3) {
        var x = (translation.x + this.width * this.scaleX! + this.origin!.position.x) / this.scaleX!;
        var y = (-translation.y + this.height * this.scaleY! + this.origin!.position.y) / this.scaleY!;
        return {
            x: x,
            y: y
        };
    }

    globalToRos(x: number, y: number) {
        console.log(x, y)
        var rosX = (x / 5 - this.width) * this.scaleX! - this.origin!.position.x
        var rosY = (this.height - y / 5) * this.scaleY! + this.origin!.position.y
        return {
            x: rosX,
            y: rosY,
            z: 0
        } as ROSPoint
    }

    addCurrenPoseMarker() {
        var robotMarker = this.drawNavigationArrow(false, [255, 128, 0])
        this.rootObject.addChild(robotMarker)

        const setPoseInterval = setInterval(() => {
            let pose = this.functs.GetPose()
            let globalCoord = this.rosToGlobal(pose.translation)
            robotMarker.x = globalCoord.x
            robotMarker.y = globalCoord.y
            robotMarker.scaleX = 1.0 / this.rootObject.scaleX
            robotMarker.scaleY = 1.0 / this.rootObject.scaleY
            robotMarker.visible = true
            this.rootObject.update()
        }, 1000);
    }

    public displayPoseMarkers(display: boolean, poses: ROSLIB.Transform[], poseNames: string[]) {
        if (!display) {
            this.savedPoseMarkers.forEach(marker => {
                marker.circle.visible = false
                marker.label.visible = false
            })
        } else {
            // Re-draw or add pose markers
            poses.forEach((pose, index) => {
                // Recreate marker
                let globalCoord = this.rosToGlobal(pose.translation)
                var poseMarker = this.drawSavedPoseMarker(
                    globalCoord.x, globalCoord.y, [0, 0, 255], poseNames[index]
                )
                poseMarker.circle.visible = true
                poseMarker.label.visible = false

                var label_idx = this.savedPoseMarkersLabels.indexOf(poseNames[index])
                // If old pose marker label exists, overwrite marker
                if (label_idx !== -1) {
                    var oldPoseMarker = this.savedPoseMarkers[label_idx]
                    this.rootObject.removeChild(oldPoseMarker.circle)
                    this.rootObject.removeChild(oldPoseMarker.label)
                    this.savedPoseMarkers[label_idx] = poseMarker
                    this.savedPoseMarkersLabels[label_idx] = poseNames[index]
                } else {
                    this.savedPoseMarkers.push(poseMarker)
                    this.savedPoseMarkersLabels.push(poseNames[index])
                }

                this.rootObject.addChild(poseMarker.circle)
                this.rootObject.addChild(poseMarker.label)
            })
        }
        this.rootObject.update()
    }

    public createGoalMarker(x: number, y: number, ros: boolean) {
        let globalCoord = {x: x, y: y}
        if (ros) globalCoord = this.rosToGlobal({x: x, y: y, z: 0} as ROSLIB.Vector3)
        if (this.getGoalReached) clearInterval(this.getGoalReached)
        if (this.goalMarker) this.rootObject.removeChild(this.goalMarker)
        this.goalMarker = this.drawNavigationArrow(true, [255, 0, 0])
        this.goalMarker.x = globalCoord.x
        this.goalMarker.y = globalCoord.y
        this.goalMarker.scaleX = 1.0 / this.rootObject.scaleX
        this.goalMarker.scaleY = 1.0 / this.rootObject.scaleY
        this.goalMarker.visible = true
        this.rootObject.addChild(this.goalMarker)

        this.getGoalReached = setInterval(() => {
            if (this.functs.GoalReached()) {
                this.rootObject.removeChild(this.goalMarker!)
                clearInterval(this.getGoalReached)
            }
        }, 1000);
    }

    createOccupancyGridClient() {
        this.createOccupancyGrid()
        this.addCurrenPoseMarker()

        this.rootObject.on('click', (event) => {
            console.log(this.functs.SelectGoal())
            if (this.functs.SelectGoal()) {
                let evt = event as createjs.MouseEvent
                // convert to ROS coordinates
                var position: ROSPoint = this.globalToRos(evt.stageX, evt.stageY);
                console.log(position)

                this.functs.MoveBase({
                    position: position,
                    orientation: { x: 0, y: 0, z: -0.45, w: 0.893 }
                } as ROSPose)

                this.createGoalMarker(evt.stageX / 5, evt.stageY / 5, false)
            }
        });
    }
}