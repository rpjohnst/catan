let radius = 45,
	hexagon_narrow_width = 3 / 2 * radius,
	hexagon_height = 2 * radius * Math.sin(Math.PI / 3),
	width = 1050, height = 525;

module.exports = { radius: radius, width: width, height: height, };

let tileToPixels = module.exports.tileToPixels = function (x, y) {
	let xx = x - 3, yy = y - 3;
	return [
		width / 4 + 20 + hexagon_narrow_width * xx,
		height / 2 - hexagon_height * (xx / 2 + yy)
	];
};

let vertexToPixels = module.exports.vertexToPixels = function (x, y, d) {
	let [px, py] = tileToPixels(x, y);
	if (d == 0) { px -= radius; }
	else if (d == 1) { px += radius; }
	return [px, py];
};

let pixelsToTile = module.exports.pixelsToTile = function (px, py) {
	// convert to fractional cube coordinates
	let x = (px - width / 4 - 20) / hexagon_narrow_width,
		y = (height / 2 - py) / hexagon_height - x / 2,
		z = -(x + y);

	// round to nearest cube and calculate the difference
	let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
	let dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);

	// whichever coordinate moved farthest, push it back into the hex grid plane
	if (dx > dy && dx > dz) {
		rx = -(ry + rz);
	} else if (dy > dz) {
		ry = -(rx + rz);
	} else {
		rz = -(rx + ry);
	}

	return [rx + 3, ry + 3];
};

let pixelsToVertex = module.exports.pixelsToVertex = function (px, py) {
	let [x, y] = pixelsToTile(px, py);
	let [cx, cy] = tileToPixels(x, y);
	let angle = Math.atan2(cy - py, px - cx);
	let hextant = (Math.floor((angle + Math.PI / 6) / 2 / Math.PI * 6) + 6) % 6;

	switch (hextant) {
	case 0: return [x, y, 1];
	case 1: return [x + 1, y, 0];
	case 2: return [x - 1, y + 1, 1];
	case 3: return [x, y, 0];
	case 4: return [x - 1, y, 1];
	case 5: return [x + 1, y - 1, 0];
	}
};

let pixelsToEdge = module.exports.pixelsToEdge = function (px, py) {
	let [x, y] = pixelsToTile(px, py);
	let [cx, cy] = tileToPixels(x, y);
	let angle = Math.atan2(cy - py, px - cx);
	let hextant = (Math.floor(angle / 2 / Math.PI * 6) + 6) % 6;

	switch (hextant) {
	case 0: return [x, y, 2];
	case 1: return [x, y, 1];
	case 2: return [x, y, 0];
	case 3: return [x - 1, y, 2];
	case 4: return [x, y - 1, 1];
	case 5: return [x + 1, y - 1, 0];
	}
};
