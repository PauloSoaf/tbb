ARG SPEACHES_BASE_IMAGE
FROM ${SPEACHES_BASE_IMAGE}

ARG SPEACHES_FASTAPI_VERSION=0.117.1

USER root
RUN uv pip install \
    --python /home/ubuntu/speaches/.venv/bin/python \
    "fastapi==${SPEACHES_FASTAPI_VERSION}"
USER ubuntu
