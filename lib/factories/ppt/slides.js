let { PptFactoryHelper } = require('../../helpers/ppt-factory-helper');
let { PptxContentHelper } = require('../../helpers/pptx-content-helper');
let { PptxUnitHelper } = require("../../helpers/unit-helper");
let { Utils } = require("../../helpers/utils");

class SlideFactory {
    constructor(parentFactory, args) {
        this.parentFactory = parentFactory;
        this.content = parentFactory.content;
        this.args = args;
    }

    addSlide(slideName, layoutName) {
        let relsKey = `ppt/slides/_rels/${slideName}.xml.rels`;
        let slideKey = `ppt/slides/${slideName}.xml`;
        let layoutKey = `ppt/slideLayouts/${layoutName}.xml`;

        this.content[relsKey] = {
            Relationships: {
                $: {
                    xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships',
                },
                Relationship: [
                    {
                        $: {
                            Id: 'rId1',
                            Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
                            Target: `../slideLayouts/${layoutName}.xml`,
                        },
                    },
                ],
            },
        };

        // add the actual slide itself (use the layout template as the source; note: layout templates are NOT the same as master slide templates)
        let baseSlideContent = this.content[layoutKey]['p:sldLayout'];

        delete baseSlideContent['$']['preserve'];
        delete baseSlideContent['$']['type'];

        let slideContent = {
            'p:sld': baseSlideContent,
        };

        slideContent = JSON.parse(JSON.stringify(slideContent));

        //remove template relevant shapes
        delete slideContent["p:sld"]['$']["showMasterSp"];
        delete slideContent["p:sld"]['p:cSld']['0']['p:spTree']['0']['p:pic'];
        delete slideContent["p:sld"]['p:cSld']['0']['p:spTree']['0']['p:grpSp'];
        delete slideContent["p:sld"]['p:cSld']['0']['p:bg'];

        this.content[slideKey] = slideContent;

        return slideContent;
    }

    removeSlide(slideName) {
        delete this.content[`ppt/slides/_rels/${slideName}.xml.rels`];
        delete this.content[`ppt/slides/${slideName}.xml`];
    }

    moveSlide(sourceSlideNum, destinationSlideNum) {
        if (destinationSlideNum > sourceSlideNum) {
            // move slides between start and destination backwards (e.g. slide 4 becomes 3, 3 becomes 2, etc.)
            for (let i = sourceSlideNum; i < destinationSlideNum; i++) {
                this.swapSlide(i, i + 1);
            }
        } else if (destinationSlideNum < sourceSlideNum) {
            // move slides between start and destination forward (e.g. slide 2 becomes 3, 3 becomes 4, etc.)
            for (let i = sourceSlideNum - 1; i >= destinationSlideNum; i--) {
                this.swapSlide(i, i + 1);
            }
        }
    }

    swapSlide(slideNum1, slideNum2) {
        let slideKey1 = `ppt/slides/slide${slideNum1}.xml`;
        let slideKey2 = `ppt/slides/slide${slideNum2}.xml`;
        let slideRelsKey1 = `ppt/slides/_rels/slide${slideNum1}.xml.rels`; // you need to swap rels in case slide layouts are used
        let slideRelsKey2 = `ppt/slides/_rels/slide${slideNum2}.xml.rels`;

        [this.content[slideKey1], this.content[slideKey2]] = [this.content[slideKey2], this.content[slideKey1]];
        [this.content[slideRelsKey1], this.content[slideRelsKey2]] = [this.content[slideRelsKey2], this.content[slideRelsKey1]];
    }

    addImageToSlideRelationship(slide, target) {
        let relsKey = `ppt/slides/_rels/${slide.name}.xml.rels`;
        let rId = `rId${this.content[relsKey]['Relationships']['Relationship'].length + 1}`;

        this.content[relsKey]['Relationships']['Relationship'].push({
            $: {
                Id: rId,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                Target: target,
            },
        });

        return rId;
    }

    addHyperlinkToSlideRelationship(slide, target) {
        if (!target) return '';

        let relsKey = `ppt/slides/_rels/${slide.name}.xml.rels`;
        let rId = `rId${this.content[relsKey]['Relationships']['Relationship'].length + 1}`;

        this.content[relsKey]['Relationships']['Relationship'].push({
            $: {
                Id: rId,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
                Target: target,
                TargetMode: 'External',
            },
        });

        return rId;
    }

    addSlideTargetRelationship(slide, target) {
        if (!target) return '';

        let relsKey = `ppt/slides/_rels/${slide.name}.xml.rels`;
        let rId = `rId${this.content[relsKey]['Relationships']['Relationship'].length + 1}`;

        this.content[relsKey]['Relationships']['Relationship'].push({
            $: {
                Id: rId,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
                Target: target,
            },
        });

        return rId;
    }

    addChartToSlideRelationship(slide, chartName) {
        let relsKey = `ppt/slides/_rels/${slide.name}.xml.rels`;
        let rId = `rId${this.content[relsKey]['Relationships']['Relationship'].length + 1}`;

        this.content[relsKey]['Relationships']['Relationship'].push({
            $: {
                Id: rId,
                Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
                Target: `../charts/${chartName}.xml`,
            },
        });

        return rId;
    }

    addConnector(slide, connector, options) {
        let slideKey = `ppt/slides/${slide.name}.xml`;
        let objectId = slide.getNextObjectId();
        let spTreeRoot = this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0];
        let slideInfo = Object.values(PptxContentHelper.extractInfoFromSlides(this.content)).find(slideInfo => slideInfo.name === slide.name);
        let theme = Utils.getPath(slideInfo, ["layout", "master", "theme", "name"]);
        let connectorThemeProperties = Utils.getPath(this.content, [`ppt/theme/${theme}.xml`, "a:theme", "a:objectDefaults", 0, "a:lnDef", 0, "a:spPr", 0]);
        let connectorBlock = PptFactoryHelper.createConnectorBlock({ 
            objectId, 
            name: `Connector${objectId}`, 
            options: { 
                x: PptxUnitHelper.fromPixels(connector.x()),
                y: PptxUnitHelper.fromPixels(connector.y()), 
                cx: PptxUnitHelper.fromPixels(connector.cx()), 
                cy: PptxUnitHelper.fromPixels(connector.cy()),
                flipH: connector.flipH(),
                start: connector.start(),
                startPosition: connector.startPosition()
            }
        });

        //apply theme
        Object.keys(connectorThemeProperties || {}).forEach(key => connectorBlock['p:spPr'][0][key] = connectorThemeProperties[key]);

        if(!spTreeRoot["p:cxnSp"]) spTreeRoot["p:cxnSp"] = [];
        spTreeRoot["p:cxnSp"].push(connectorBlock);
        return connectorBlock;
        
    }

    addImage(slide, image, imageObjectName, rId) {
        let slideKey = `ppt/slides/${slide.name}.xml`;
        let picObjectId = slide.getNextObjectId();

        // start the p:pic root node if it doesn't exist (i.e. there are no images on the slide yet)
        if (!this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:pic']) {
            this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:pic'] = [];
        }

        let newImageBlock = {
            'p:nvPicPr': [
                {
                    'p:cNvPr': [{ $: { id: picObjectId, name: imageObjectName, descr: imageObjectName } }],
                    'p:cNvPicPr': [{ 'a:picLocks': [{ $: { noChangeAspect: '1' } }] }],
                    'p:nvPr': [{}],
                },
            ],
            'p:blipFill': [
                {
                    'a:blip': [{ $: { 'r:embed': rId, cstate: 'print' } }],
                    'a:stretch': [{ 'a:fillRect': [{}] }],
                },
            ],
            'p:spPr': [
                {
                    'a:xfrm': [
                        {
                            'a:off': [{ $: { x: PptxUnitHelper.fromPixels(image.x()), y: PptxUnitHelper.fromPixels(image.y()) } }],
                            'a:ext': [{ $: { cx: PptxUnitHelper.fromPixels(image.cx()), cy: PptxUnitHelper.fromPixels(image.cy()) } }],
                        },
                    ],
                    'a:prstGeom': [
                        {
                            $: { prst: 'rect' },
                            'a:avLst': [{}],
                        },
                    ],
                },
            ],
        };

        if (typeof image.options.url === 'string' && image.options.url.length > 0) {
            newImageBlock['p:nvPicPr'][0]['p:cNvPr'][0]['a:hlinkClick'] = [{ $: { 'r:id': image.options.rIdForHyperlink } }];
            if (image.options.url[0] === '#') newImageBlock['p:nvPicPr'][0]['p:cNvPr'][0]['a:hlinkClick'][0]['$'].action = 'ppaction://hlinksldjump';
        }

        this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:pic'].push(newImageBlock);

        return newImageBlock;
    }

    addText(slide, textBox) {
        let slideKey = `ppt/slides/${slide.name}.xml`;
        let objectId = slide.getNextObjectId();
        let options = textBox.options;

        if (!this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp']) {
            this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'] = [];
        }

        // construct the bare minimum structure of a shape block (text objects are a special case of shape)
        let newTextBlock = PptFactoryHelper.createBaseShapeBlock(objectId, 'Text', PptxUnitHelper.fromPixels((textBox.x()), PptxUnitHelper.fromPixels(textBox.y()), PptxUnitHelper.fromPixels(textBox.cx()), PptxUnitHelper.fromPixels(textBox.cy())));

        // now add the nodes which turn a shape block into a text block
        newTextBlock['p:nvSpPr'][0]['p:cNvSpPr'] = [{ $: { txBox: '1' } }];
        newTextBlock['p:txBody'][0]['a:bodyPr'] = [{ $: { rtlCol: '0' } }];

        if (options.backgroundColor) {
            newTextBlock['p:spPr'][0]['a:solidFill'] = [PptFactoryHelper.createColorBlock(options.backgroundColor)];
        } else {
            newTextBlock['p:spPr'][0]['a:noFill'] = [{}];
        }

        PptFactoryHelper.addTextValuesToBlock(newTextBlock['p:txBody'][0], textBox, options);
        PptFactoryHelper.setTextBodyProperties(newTextBlock['p:txBody'][0]['a:bodyPr'][0], textBox, options);
        PptFactoryHelper.addLinePropertiesToBlock(newTextBlock['p:spPr'][0], options.line);

        if (typeof options.url === 'string' && options.url.length > 0) {
            if (options.applyHrefOnShapeOnly) {
                newTextBlock['p:nvSpPr'][0]['p:cNvPr'][0]['a:hlinkClick'] = [{ $: { 'r:id': options.rIdForHyperlink } }];

                if (options.url[0] === '#') {
                    newTextBlock['p:nvSpPr'][0]['p:cNvPr'][0]['a:hlinkClick'][0]['$'].action = 'ppaction://hlinksldjump';
                }
            } else {
                newTextBlock['p:txBody'][0]['a:p'][0]['a:r'][0]['a:rPr'][0]['a:hlinkClick'] = [{ $: { 'r:id': options.rIdForHyperlink } }];

                if (options.url[0] === '#') {
                    newTextBlock['p:txBody'][0]['a:p'][0]['a:r'][0]['a:rPr'][0]['a:hlinkClick'][0]['$'].action = 'ppaction://hlinksldjump';
                }
            }
        }

        this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'].push(newTextBlock);

        return newTextBlock;
    }

    editShape(shape) {
        let shapeBlock = shape.getContent();
        //update text
        delete shapeBlock['p:txBody'][0]["a:p"];
        PptFactoryHelper.addTextValuesToBlock(shapeBlock['p:txBody'][0], shape, shape.options);
        return shapeBlock;
    }

    addShape(slide, shape) {
        let slideKey = `ppt/slides/${slide.name}.xml`;
        let objectId = slide.getNextObjectId();
        let options = shape.options;
        let type = shape.shapeType;
        let shapeColor = options.color || '00AA00';

        if (options.textAlign === undefined) {
            options.textAlign = 'center'; // for shapes, we always want text defaulted to the center
        }

        if (!this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp']) {
            this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'] = [];
        }

        let slideInfo = Object.values(PptxContentHelper.extractInfoFromSlides(this.content)).find(slideInfo => slideInfo.name === slide.name);
        let theme = Utils.getPath(slideInfo, ["layout", "master", "theme", "name"]);
        let shapeThemeProperties = Utils.getPath(this.content, [`ppt/theme/${theme}.xml`, "a:theme", "a:objectDefaults", 0, "a:spDef", 0, "a:spPr", 0]);

        let newShapeBlock = PptFactoryHelper.createBaseShapeBlock({ 
            objectId, 
            name: shape.name() || `Shape ${objectId}`, 
            x: PptxUnitHelper.fromPixels(shape.x()), 
            y: PptxUnitHelper.fromPixels(shape.y()), 
            cx: PptxUnitHelper.fromPixels(shape.cx()), 
            cy: PptxUnitHelper.fromPixels(shape.cy())
        });

        //apply theme
        Object.keys(shapeThemeProperties || {}).forEach(key => newShapeBlock['p:spPr'][0][key] = shapeThemeProperties[key]);

        newShapeBlock['p:spPr'][0]['a:prstGeom'][0]['$'].prst = type.name;
        newShapeBlock['p:spPr'][0]['a:solidFill'] = [PptFactoryHelper.createColorBlock(shapeColor, options.transparency)];
        newShapeBlock['p:txBody'][0]['a:bodyPr'] = [{ $: { rtlCol: '0' } }];

        PptFactoryHelper.addAvLstToBlock(newShapeBlock['p:spPr'][0]['a:prstGeom'][0], type.avLst);
        PptFactoryHelper.addTextValuesToBlock(newShapeBlock['p:txBody'][0], shape, options);
        PptFactoryHelper.setTextBodyProperties(newShapeBlock['p:txBody'][0]['a:bodyPr'][0], shape, options);
        PptFactoryHelper.addLinePropertiesToBlock(newShapeBlock['p:spPr'][0], options.line);

        this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'].push(newShapeBlock);

        if (typeof options.url === 'string' && options.url.length > 0) {
            newShapeBlock['p:nvSpPr'][0]['p:cNvPr'][0]['a:hlinkClick'] = [{ $: { 'r:id': options.rIdForHyperlink } }];
            if (options.url[0] === '#') newShapeBlock['p:nvSpPr'][0]['p:cNvPr'][0]['a:hlinkClick'][0]['$'].action = 'ppaction://hlinksldjump';
        }

        return newShapeBlock;
    }

    copyShape({ slide, shape, shapeCopyName }) {
        let shapeCopyContent = JSON.parse(JSON.stringify(shape.getContent()));
        PptFactoryHelper.setShapeBlockName({ shapeBlock: shapeCopyContent, name: shapeCopyName });
        PptFactoryHelper.setShapeBlockId({ shapeBlock: shapeCopyContent, id: slide.getNextObjectId() });
        let slideKey = `ppt/slides/${slide.name}.xml`;
        this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'].push(shapeCopyContent);
        return shapeCopyContent;
    }

    addChart(slide, chart) {
        let slideKey = `ppt/slides/${slide.name}.xml`;
        let chartKey = `ppt/charts/${chart.name}.xml`;

        let newGraphicFrameBlock = PptFactoryHelper.createBaseChartFrameBlock(PptxUnitHelper.fromPixels(chart.x()), PptxUnitHelper.fromPixels(chart.y()), PptxUnitHelper.fromPixels(chart.cx()), PptxUnitHelper.fromPixels(chart.cy())); // goes onto the slide
        let newChartSpaceBlock = PptFactoryHelper.createBaseChartSpaceBlock(); // goes into the chart XML
        let seriesDataBlock = PptFactoryHelper.createSeriesDataBlock(chart.chartData);

        newChartSpaceBlock['c:chartSpace']['c:chart'][0]['c:plotArea'][0]['c:barChart'][0]['c:ser'] = seriesDataBlock['c:ser'];

        this.content[chartKey] = newChartSpaceBlock;
        this.content[slideKey]['p:sld']['p:cSld'][0]['p:spTree'][0]['p:graphicFrame'] = newGraphicFrameBlock['p:graphicFrame'];

        return newGraphicFrameBlock;
    }

    setBackgroundColor(slide, color) {
        let slideKey = `ppt/slides/${slide.name}.xml`;
        let slideContent = this.content[slideKey]['p:sld']['p:cSld'][0];

        if (slideContent['p:bg'] !== undefined) {
            if (slideContent['p:bg'][0]['p:bgPr'] === undefined) {
                slideContent['p:bg'][0]['p:bgPr'] = [{}];
            } else {
                for (let key in slideContent['p:bg'][0]['p:bgPr'][0]) {
                    if (slideContent['p:bg'][0]['p:bgPr'][0].hasOwnProperty(key)) {
                        delete slideContent['p:bg'][0]['p:bgPr'][0][key];
                    }
                }
            }

            slideContent['p:bg'][0]['p:bgPr'][0]['a:solidFill'] = [PptFactoryHelper.createColorBlock(color)];
            slideContent['p:bg'][0]['p:bgPr'][0]['a:effectLst'] = [{}];
        } else {
            // The <p:bg> (background) node has to go first, but if we just insert the key and contents, it will end up after the object elements
            // once it's converted to XML. So here we must save the existing contents...
            let existingNodes = PptxContentHelper.extractNodes(slideContent); // this also deletes the nodes from slideContent

            // ...and add the <p:bg> node and existing content nodes back in.
            slideContent['p:bg'] = [{}];
            slideContent['p:bg'][0]['p:bgPr'] = [{}];

            // right now we only support solid colored backgrounds (no gradient or texture fills)
            slideContent['p:bg'][0]['p:bgPr'][0]['a:solidFill'] = [PptFactoryHelper.createColorBlock(color)];
            slideContent['p:bg'][0]['p:bgPr'][0]['a:effectLst'] = [{}];

            PptxContentHelper.restoreNodes(slideContent, existingNodes);
        }
    }
}

module.exports.SlideFactory = SlideFactory;
