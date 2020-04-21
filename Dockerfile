FROM ubuntu

ADD ./dist/depno /

ENTRYPOINT [ "/depno" ]